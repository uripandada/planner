import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import moment from 'moment';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import {
    HotelItemData,
  InsertLostAndFoundCommand,
  LostAndFoundClient,
  LostAndFoundFilesUploadedData,
  LostAndFoundModel,
  FoundStatus,
  GuestStatus,
  DeliveryStatus,
  OtherStatus,
  TaskWhereData,
  TypeOfLoss,
  UpdateLostAndFoundCommand
} from 'src/app/core/autogenerated-clients/api-client';
import { FileDetails, FilesChangedData } from 'src/app/shared/components/file-upload/file-upload.component';
import { HotelService } from '../../core/services/hotel.service';

@Component({
  selector: 'app-lost-and-found-edit',
  templateUrl: './lost-and-found-edit.component.html',
  styleUrls: ['./lost-and-found-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LostAndFoundEditComponent implements OnInit, OnChanges {

  @Input() item: LostAndFoundModel;
  @Input() allWheres: Array<TaskWhereData> = [];

  @Output() reloadList: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() cancelled: EventEmitter<boolean> = new EventEmitter<boolean>();


  selectedFiles: Array<FilesChangedData> = [];
  currentlyUploadingFiles$: BehaviorSubject<Array<FileDetails>> = new BehaviorSubject<Array<FileDetails>>([]);
  temporaryUploadedFiles$: BehaviorSubject<Array<FileDetails>> = new BehaviorSubject<Array<FileDetails>>([]);
  uploadedFiles$: BehaviorSubject<Array<FileDetails>> = new BehaviorSubject<Array<FileDetails>>([]);

  isLostItem: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  lostForm: FormGroup;

  typesOfLoss: Array<{ key: TypeOfLoss, value: string }> = [];

  foundStatuses: Array<{key: FoundStatus, value: string}> = [];
  foundStatusMappings: { [index: number]: string } = {};

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
    this.typesOfLoss.push({ key: TypeOfLoss.Unknown, value: "Unknown" });

    this.foundStatuses.push({ key: FoundStatus.WaitingRoomMaid, value: "Waiting Room Maid" });
    this.foundStatuses.push({ key: FoundStatus.Received, value: "Received" });

    this.hotels = hotelService.getHotels();
  }

  ngOnInit(): void {
    this.allWheres = this._route.snapshot.data.allWheres;
    this.initForm();
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

  initForm() {
    this.isLostItem.next(true);

    let where: TaskWhereData;
    if (this.item.reservationId) {
      where = this.allWheres.find(x => x.referenceId == this.item.reservationId);
    }
    else if (this.item.roomId) {
      where = this.allWheres.find(x => x.referenceId == this.item.roomId);
    }

    this.lostForm = this.formBuilder.group({
      hotelId: [this.item.hotelId, Validators.required],
      name: [this.item.name, Validators.required],
      phoneNumber: [this.item.phoneNumber],
      email: [this.item.email],
      address: [this.item.address],
      city: [this.item.city],
      postalCode: [this.item.postalCode],
      country: [this.item.country],

      description: [this.item.description, Validators.required],
      lostOn: [this.item.lostOn?.format('yyyy-MM-DD'), Validators.required],
      notes: [this.item.notes],
      typeOfLoss: [this.item.typeOfLoss, Validators.required],
      foundStatus: [this.item.foundStatus, Validators.required],
      guestStatus: [this.item.guestStatus, Validators.required],
      deliveryStatus: [this.item.deliveryStatus, Validators.required],
      otherStatus: [this.item.otherStatus, Validators.required],
      whereFrom: [where],
      placeOfStorage: [this.item.placeOfStorage],
      trackingNumber: [this.item.trackingNumber],
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

    this.lostForm.controls.hotelId.setValue(this.item.hotelId);
    this.lostForm.controls.name.setValue(this.item.name);
    this.lostForm.controls.phoneNumber.setValue(this.item.phoneNumber);
    this.lostForm.controls.email.setValue(this.item.email);
    this.lostForm.controls.address.setValue(this.item.address);
    this.lostForm.controls.city.setValue(this.item.city);
    this.lostForm.controls.postalCode.setValue(this.item.postalCode);
    this.lostForm.controls.country.setValue(this.item.country);
    this.lostForm.controls.description.setValue(this.item.description);
    this.lostForm.controls.lostOn.setValue(this.item.lostOn?.format('yyyy-MM-DD'));
    this.lostForm.controls.notes.setValue(this.item.notes);
    this.lostForm.controls.typeOfLoss.setValue(this.item.typeOfLoss);
    this.lostForm.controls.foundStatus.setValue(this.item.foundStatus);
    this.lostForm.controls.guestStatus.setValue(this.item.guestStatus);
    this.lostForm.controls.deliveryStatus.setValue(this.item.deliveryStatus);
    this.lostForm.controls.otherStatus.setValue(this.item.otherStatus);
    this.lostForm.controls.whereFrom.setValue(where);
    this.lostForm.controls.placeOfStorage.setValue(this.item.placeOfStorage);
    this.lostForm.controls.trackingNumber.setValue(this.item.trackingNumber);

    this.lostForm.markAsUntouched({ onlySelf: false });
    this.lostForm.markAsPristine({ onlySelf: false });

    this.lostForm.updateValueAndValidity({ onlySelf: false, emitEvent: false });

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

  save() {
    this.lostForm.markAsTouched({ onlySelf: false });
    if (this?.lostForm.invalid && this.isLostItem.value) {
      this.toastr.error("You have to fix invalid form fields before you can continue.");
      return;
    }

    let formValues = this.lostForm.getRawValue();

    let insertRequest = new InsertLostAndFoundCommand({
      hotelId: formValues.hotelId,
      description: formValues.description,
      lostOn: moment.utc(formValues.lostOn),
      foundStatus: formValues.foundStatus,
      guestStatus: formValues.guestStatus,
      deliveryStatus: formValues.deliveryStatus,
      otherStatus: formValues.otherStatus,
      typeOfLoss: formValues.typeOfLoss,
      address: formValues.address,
      postalCode: formValues.postalCode,
      city: formValues.city,
      country: formValues.country,
      notes: formValues.notes,
      name: formValues.name,
      phoneNumber: formValues.phoneNumber,
      email: formValues.email,
      whereData: formValues.whereFrom,
      isLostItem: true,
      placeOfStorage: formValues.placeOfStorage,
      trackingNumber: formValues.trackingNumber,
      referenceNumber: null,
      reservationId: null,
      roomId: null,
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

      let updateRequest = new UpdateLostAndFoundCommand({
        ...insertRequest,
        id: this.item.id,
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

  public uploadedFilesChanged(fileChanges: Array<FilesChangedData>) {
    this.selectedFiles = fileChanges;
  }

  cancel() {
    this.cancelled.next(true);
  }

  get l() {
    return this.lostForm.controls;
  }

  public canShowErrorMessage(control: string,): boolean {
    const foundForm = this.lostForm as FormGroup;
    if (foundForm.controls[control]) {
      return !!(
        (foundForm.controls[control].touched || foundForm.touched) &&
        foundForm.controls[control].errors
      );
    } else {
      return false;
    }
  }

}
