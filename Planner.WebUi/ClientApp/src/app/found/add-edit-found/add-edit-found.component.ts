import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Subscription } from 'rxjs';
import {
  CategoryGridItemViewModel,
  ExtendedWhereData,
  HotelItemData,
  InsertLostAndFoundCommand,
  LostAndFoundClient,
  LostAndFoundFilesUploadedData,
  LostAndFoundModel,
  LostAndFoundStatus,
  TaskWhereData,
  TypeOfLoss,
  UpdateLostAndFoundCommand
} from 'src/app/core/autogenerated-clients/api-client';
import { FileDetails, FilesChangedData } from 'src/app/shared/components/file-upload/file-upload.component';
import moment from 'moment';
import { HotelService } from '../../core/services/hotel.service';

@Component({
  selector: 'app-add-edit-found',
  templateUrl: './add-edit-found.component.html',
  styleUrls: ['./add-edit-found.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddEditFoundComponent implements OnInit {

  @Input() item: LostAndFoundModel;
  @Input() allWheres: Array<TaskWhereData> = [];
  @Input() allCategories: Array<CategoryGridItemViewModel> = [];
  @Input() currentlyUploadingFiles: Array<FileDetails> = [];  
  @Input() temporaryUploadedFiles: Array<FileDetails> = [];  
  @Input() uploadedFiles: Array<FileDetails> = [];

  @Output() reloadList: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() cancelled: EventEmitter<boolean> = new EventEmitter<boolean>();


  selectedFiles: Array<FilesChangedData> = [];
  currentlyUploadingFiles$: BehaviorSubject<Array<FileDetails>> = new BehaviorSubject<Array<FileDetails>>([]);
  temporaryUploadedFiles$: BehaviorSubject<Array<FileDetails>> = new BehaviorSubject<Array<FileDetails>>([]);
  uploadedFiles$: BehaviorSubject<Array<FileDetails>> = new BehaviorSubject<Array<FileDetails>>([]);

  foundForm: FormGroup;

  typesOfLoss: Array<{ key: TypeOfLoss, value: string }> = [];
  statuses: Array<{ key: LostAndFoundStatus, value: string }> = [];
  foundstatuses: Array<{ key: number, value: string }> = [];
  gueststatuses: Array<{ key: number, value: string }> = [];
  deliverystatuses: Array<{ key: number, value: string }> = [];
  otherstatuses: Array<{ key: number, value: string }> = [];
  statusMappings: { [index: number]: string } = {};
  statusChange$: Subscription;
  statusFlag: number;

  selectedFoundStatus: string;
  selectedGuestStatus: string;

  isFoundStatus: boolean;
  isGuestStatus: boolean;
  isDeliveryStatus: boolean;
  isOtherStatus: boolean;

  hotels: HotelItemData[] = [];

  public isCreateNew = true;
  constructor(
    private formBuilder: FormBuilder,
    private toastr: ToastrService,
    private _route: ActivatedRoute,
    private lostAndFoundClient: LostAndFoundClient,
    public hotelService: HotelService,
  ) {
    this.typesOfLoss.push({ key: TypeOfLoss.Customer, value: "Customer" });
    this.typesOfLoss.push({ key: TypeOfLoss.Employee, value: "Employee" });

    this.foundstatuses.push({ key: 1, value: "Waiting Room Maid"});
    this.foundstatuses.push({ key: 2, value: "Received"});

    this.gueststatuses.push({ key: 3, value: "Unclaimed"});
    this.gueststatuses.push({ key: 4, value: "Contact by email"});
    this.gueststatuses.push({ key: 5, value: "Contact by phone"});
    this.gueststatuses.push({ key: 6, value: "Client Undecided"});
    this.gueststatuses.push({ key: 7, value: "Waiting For Client Return"});
    this.gueststatuses.push({ key: 8, value: "Waiting For Hand-Delivered"});
    this.gueststatuses.push({ key: 9, value: "Waiting For Shipment"});

    this.deliverystatuses.push({ key: 10, value: "OT Shipped"});
    this.deliverystatuses.push({ key: 11, value: "Hand Delivered"});

    this.otherstatuses.push({ key: 12, value: "Expired"});
    this.otherstatuses.push({ key: 13, value: "Refused By The Client"});
    this.otherstatuses.push({ key: 14, value: "Bad Referencing"});
    this.otherstatuses.push({ key: 15, value: "Detruit"});
    this.otherstatuses.push({ key: 16, value: "Rendu a linventeur"});
    this.otherstatuses.push({ key: 17, value: "Donne a une autre personne"});
    this.otherstatuses.push({ key: 18, value: "Disparu/Perdu"});

    this.statuses.push({ key: LostAndFoundStatus.WaitingRoomMaid, value: "Waiting Room Maid" });
    this.statuses.push({ key: LostAndFoundStatus.Unclaimed, value: "Unclaimed" });
    this.statuses.push({ key: LostAndFoundStatus.ClientContacted, value: "Client Contacted" });
    this.statuses.push({ key: LostAndFoundStatus.ClientUndecided, value: "Client Undecided" });
    this.statuses.push({ key: LostAndFoundStatus.WaitingForClientReturn, value: "Waiting For Client Return" });
    this.statuses.push({ key: LostAndFoundStatus.WaitingForShipment, value: "Waiting For Shipment" });
    this.statuses.push({ key: LostAndFoundStatus.OTShipped, value: "OT Shipped" });
    this.statuses.push({ key: LostAndFoundStatus.WaitingForHandDelivered, value: "Waiting For Hand Delivered" });
    this.statuses.push({ key: LostAndFoundStatus.HandDelivered, value: "Hand Delivered" });
    this.statuses.push({ key: LostAndFoundStatus.Expired, value: "Expired" });
    this.statuses.push({ key: LostAndFoundStatus.RefusedByTheClient, value: "Refused By The Client" });
    this.statuses.push({ key: LostAndFoundStatus.BadReferencing, value: "Bad Referencing" });

    this.hotels = hotelService.getHotels();
  }

  
  ngOnInit(): void {
    this.allWheres = this._route.snapshot.data.allWheres;
    this.allCategories = this._route.snapshot.data.allCategories;
    this.initForm();
    this.statusFlag = 3;
    this.selectedFoundStatus = this.foundstatuses[0].value;
    this.selectedGuestStatus = this.gueststatuses[0].value;

    this.isFoundStatus = false;
    this.isGuestStatus = false;
    this.isDeliveryStatus = false;
    this.isOtherStatus = false;
    
    this.statusChange$ = this.foundForm.controls['status'].valueChanges.subscribe((value: number) => {
      if(value === LostAndFoundStatus.ClientContacted) {
        this.addClientFormControls();
      } else {
        this.removeClientFormControls();
      }
    })
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (this.item.id) {
      this.isCreateNew = false;
      
    } else {
      this.isCreateNew = true;
    }
    
    if (!changes.item.firstChange) {
      this.setFormData();
    }
  }
  
  foundstatus(){
    this.isFoundStatus = true;
    this.isGuestStatus = false;
    this.isDeliveryStatus = false;
    this.isOtherStatus = false;
  }

  gueststatus(){
    this.isFoundStatus = true;
    this.isGuestStatus = true;
    this.isDeliveryStatus = false;
    this.isOtherStatus = false;
  }

  deliverystatus(){
    this.isFoundStatus = true;
    this.isGuestStatus = true;
    this.isDeliveryStatus = true;
    this.isOtherStatus = false;
  }

  otherstatus(){
    this.isFoundStatus = false;
    this.isGuestStatus = false;
    this.isDeliveryStatus = false;
    this.isOtherStatus = true;
  }

  initForm() {
    let where: TaskWhereData;
    if (this.item.reservationId) {
      where = this.allWheres.find(x => x.referenceId == this.item.reservationId);
    }
    else if (this.item.roomId) {
      where = this.allWheres.find(x => x.referenceId == this.item.roomId);
    }
    this.foundForm = this.formBuilder.group({
      hotelId: [this.item.hotelId, Validators.required],
      firstName: [this.item.firstName, Validators.required],
      lastName: [this.item.lastName, Validators.required],
      phoneNumber: [this.item.phoneNumber],
      email: [this.item.email],
      address: [this.item.address],
      city: [this.item.city],
      postalCode: [this.item.postalCode],
      country: [this.item.country],
      clientName: [this.item.reservationId],
      description: [this.item.description, Validators.required],
      foundOn: [this.item.lostOn?.format('yyyy-MM-DD'), Validators.required],
      notes: [this.item.notes],
      typeOfLoss: [this.item.typeOfLoss, Validators.required],
      status: [this.item.status, Validators.required],
      funstatus: [this.foundstatuses[0].key, Validators.required],
      gueststatus: [this.gueststatuses[0].key, Validators.required],
      deliverystatus: ['', Validators.required],
      otherstatus: ['', Validators.required],
      storage: ['', Validators.required],
      category: ['', Validators.required],
      whereFrom: [where, Validators.required],
      placeOfStorage: [this.item.placeOfStorage],
      foundByNumber: [''],

      ownerFirstName: [this.item.firstName],
      ownerLastName: [this.item.lastName],
      ownerPhoneNumber: [this.item.phoneNumber],
      ownerEmail: [this.item.email],
      ownerAddress: [this.item.address],
      ownerCity: [this.item.city],
      ownerPostalCode: [this.item.postalCode],
      ownerCountry: [this.item.country],
    });

    if (this.item.files) {
      const files = this.item.files.map(x => ({
        id: x.id,
        isImage: x.isImage,
        imageUrl: x.url,
        fileName: x.name,
        displayText: ''
      }) as FileDetails);
      this.uploadedFiles$.next(files);
    } else {
      this.uploadedFiles$.next([]);
    }
  }

  setFormData() {
    let where: TaskWhereData;
    if (this.item.reservationId) {
      where = this.allWheres.find(x => x.referenceId == this.item.reservationId);
    }
    else if (this.item.roomId) {
      where = this.allWheres.find(x => x.referenceId == this.item.roomId);
    }
    this.foundForm.controls.hotelId.setValue(this.item.hotelId);
    this.foundForm.controls.firstName.setValue(this.item.firstName);
    this.foundForm.controls.lastName.setValue(this.item.lastName);
    this.foundForm.controls.phoneNumber.setValue(this.item.phoneNumber);
    this.foundForm.controls.email.setValue(this.item.email);
    this.foundForm.controls.address.setValue(this.item.address);
    this.foundForm.controls.city.setValue(this.item.city);
    this.foundForm.controls.postalCode.setValue(this.item.postalCode);
    this.foundForm.controls.country.setValue(this.item.country);
    this.foundForm.controls.description.setValue(this.item.description);
    this.foundForm.controls.foundOn.setValue(this.item.lostOn?.format('yyyy-MM-DD'));
    this.foundForm.controls.notes.setValue(this.item.notes);
    this.foundForm.controls.typeOfLoss.setValue(this.item.typeOfLoss);
    this.foundForm.controls.status.setValue(this.item.status);
    // this.foundForm.controls.foundstatus.setValue(this.foundstatuses[0]);
    this.foundForm.controls.whereFrom.setValue(where);
    this.foundForm.controls.placeOfStorage.setValue(this.item.placeOfStorage);
    this.foundForm.controls.foundByNumber.setValue('');
    this.foundForm.controls.ownerFirstName.setValue(this.item.firstName);
    this.foundForm.controls.ownerLastName.setValue(this.item.lastName);
    this.foundForm.controls.ownerPhoneNumber.setValue(this.item.phoneNumber);
    this.foundForm.controls.ownerEmail.setValue(this.item.email);
    this.foundForm.controls.ownerAddress.setValue(this.item.address);
    this.foundForm.controls.ownerCity.setValue(this.item.city);
    this.foundForm.controls.ownerPostalCode.setValue(this.item.postalCode);
    this.foundForm.controls.ownerCountry.setValue(this.item.country);

    this.foundForm.markAsUntouched({ onlySelf: false });
    this.foundForm.markAsPristine({ onlySelf: false });

    this.foundForm.updateValueAndValidity({ onlySelf: false, emitEvent: false });

    if (this.item.files) {
      const files = this.item.files.map(x => ({
        id: x.id,
        isImage: x.isImage,
        imageUrl: x.url,
        fileName: x.name,
        displayText: ''
      }) as FileDetails);
      this.uploadedFiles$.next(files);
    } else {
      this.uploadedFiles$.next([]);
    }
  }

  get f() {
    return this.foundForm.controls;
  }

  save() {
    this.foundForm.markAsTouched({ onlySelf: false });
    if (this.foundForm?.invalid) {
      this.toastr.error("You have to fix invalid form fields before you can continue.");
      return;
    }

    let formValues = this.foundForm.getRawValue();

    let insertRequest = new InsertLostAndFoundCommand({
      hotelId: formValues.hotelId,
      description: formValues.description,
      lostOn: moment.utc(formValues.foundOn),
      status: formValues.status,
      typeOfLoss: formValues.typeOfLoss,
      address: formValues.address,
      postalCode: formValues.postalCode,
      city: formValues.city,
      country: formValues.country,
      notes: formValues.notes,
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      phoneNumber: formValues.phoneNumber,
      email: formValues.email,
      whereData: formValues.whereFrom,
      placeOfStorage: formValues.placeOfStorage,
      referenceNumber: null,
      isLostItem: false,
      reservationId: null,
      roomId: null,
      trackingNumber: null,
      files: this.selectedFiles.map(x => new LostAndFoundFilesUploadedData({
        fileName: x.fileName,
        id: x.id
      }))
    });

    if (this.item.id === null) {
      
      this.lostAndFoundClient.insert(insertRequest).subscribe(
        response => {
          if (response.isSuccess) {
            this.toastr.success(response.message);
            this.reloadList.next(true);
          } else {
            this.toastr.error(response.message);
          }
        },
        error => {
          this.toastr.error(error);
        }
      );
    } else {
      let updateRequest = null;
      updateRequest = new UpdateLostAndFoundCommand({
        id: this.item.id,
        ...insertRequest
      });
      this.lostAndFoundClient.update(updateRequest).subscribe(
        response => {
          if (response.isSuccess) {
            this.toastr.success(response.message);
            this.reloadList.next(true);
          } else {
            this.toastr.error(response.message);
          }
        },
        error => {
          this.toastr.error(error);
        }
      );
    }

  }

  private addClientFormControls() {
   this.foundForm.addControl('firstName', new FormControl('', [Validators.required]));
   this.foundForm.addControl('lastName', new FormControl('', [Validators.required]));
   this.foundForm.addControl('phoneNumber', new FormControl(''));
   this.foundForm.addControl('email', new FormControl('', [Validators.required]));
   this.foundForm.addControl('street', new FormControl(''));
   this.foundForm.addControl('city', new FormControl(''));
   this.foundForm.addControl('postalCode', new FormControl(''));
   this.foundForm.addControl('country', new FormControl(''));
   this.foundForm.addControl('referenceNumber', new FormControl(''));
  }

  private removeClientFormControls() {
   this.foundForm.removeControl('firstName');
   this.foundForm.removeControl('lastName');
   this.foundForm.removeControl('phoneNumber');
   this.foundForm.removeControl('email');
   this.foundForm.removeControl('street');
   this.foundForm.removeControl('city');
   this.foundForm.removeControl('postalCode');
   this.foundForm.removeControl('country');
   this.foundForm.removeControl('referenceNumber');
  }

  public uploadedFilesChanged(fileChanges: Array<FilesChangedData>) {
    this.selectedFiles = fileChanges;
  }

  cancel() {
    this.cancelled.next(true);
  }

  public canShowErrorMessage(control: string,): boolean {
    const foundForm = this.foundForm as FormGroup;
    if (foundForm.controls[control]) {
      return !!(
        (foundForm.controls[control].touched || foundForm.touched) &&
        foundForm.controls[control].errors
      );
    } else {
      return false;
    }
  }

  getSelection(data: ExtendedWhereData) {        
    this.foundForm.controls.whereFrom.setValue(data.roomName);        
    this.foundForm.controls.clientName.setValue(data.guestName);    
  }

  ngOnDestroy(): void {
    if (this.statusChange$) this.statusChange$.unsubscribe();
  }

}
