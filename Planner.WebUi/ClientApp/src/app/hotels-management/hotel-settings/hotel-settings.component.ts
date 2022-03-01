import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { CleaningPlanClient, CleaningPlanData, CpsatPlannerConfigurationData, DistanceMatrixType, FileParameter, GenerateCpsatCleaningPlanCommand, GetCleaningPlanDetailsQuery, HotelClient, HotelItemData, HotelSettingsData, ProcessResponse, SaveHotelSettingsCommand } from 'src/app/core/autogenerated-clients/api-client';
import { HotelService } from 'src/app/core/services/hotel.service';
import { LoadingService } from 'src/app/core/services/loading.service';
import { MomentDateHelper } from 'src/app/shared/helpers/moment-date.helper';

@Component({
  selector: 'app-hotel-settings',
  templateUrl: './hotel-settings.component.html',
  styleUrls: ['./hotel-settings.component.scss']
})
export class HotelSettingsComponent implements OnInit, OnChanges {
  @Input() hotelSettings: HotelSettingsData;
  @Input() hotel: HotelItemData;

  @Output() saved: EventEmitter<SaveHotelSettingsCommand> = new EventEmitter<SaveHotelSettingsCommand>();
  @Output() cancelled: EventEmitter<boolean> = new EventEmitter<boolean>();

  settingsForm: FormGroup;
  cpsatForm: FormGroup;

  levelsDistanceMatrixExists$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  buildingsDistanceMatrixExists$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private formBuilder: FormBuilder,
    private hotelClient: HotelClient,
    private _toastr: ToastrService,
    private hotelService: HotelService,
    public loading: LoadingService,
    private _cleaningPlanClient: CleaningPlanClient,
  ) { }

  ngOnInit() {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.initForm();
  }

  cancel() {
    this.cancelled.next(true);
  }

  initForm() {
    this.settingsForm = this.formBuilder.group({
      id: [this.hotelSettings.id],
      hotelId: [this.hotelSettings.hotelId],
      defaultCheckInTime: [this.hotelSettings.defaultCheckInTime, [Validators.required]],
      defaultCheckOutTime: [this.hotelSettings.defaultCheckOutTime, [Validators.required]],
      defaultAttendantStartTime: [this.hotelSettings.defaultAttendantStartTime, [Validators.required]],
      defaultAttendantEndTime: [this.hotelSettings.defaultAttendantEndTime, [Validators.required]],
      defaultAttendantMaxCredits: [this.hotelSettings.defaultAttendantMaxCredits],
      reserveBetweenCleanings: [this.hotelSettings.reserveBetweenCleanings],
      travelReserve: [this.hotelSettings.travelReserve],
      showHoursInWorkerPlanner: [this.hotelSettings.showHoursInWorkerPlanner],
      useOrderInPlanning: [this.hotelSettings.useOrderInPlanning],
      showCleaningDelays: [this.hotelSettings.showCleaningDelays],
      allowPostponeCleanings: [this.hotelSettings.allowPostponeCleanings],
      emailAddressesForSendingPlan: [this.hotelSettings.emailAddressesForSendingPlan, [Validators.email]],
      sendPlanToAttendantsByEmail: [this.hotelSettings.sendPlanToAttendantsByEmail],
      fromEmailAddress: [this.hotelSettings.fromEmailAddress, [Validators.email]],
      cleanHostelRoomBedsInGroups: [this.hotelSettings.cleanHostelRoomBedsInGroups, [Validators.required]],
      //buildingsDistanceMatrix: [this.hotelSettings.buildingsDistanceMatrix],
      //levelsDistanceMatrix: [this.hotelSettings.levelsDistanceMatrix],
      buildingAward: [this.hotelSettings.buildingAward, [Validators.required]],
      levelAward: [this.hotelSettings.levelAward, [Validators.required]],
      roomAward: [this.hotelSettings.roomAward, [Validators.required]],
      levelTime: [this.hotelSettings.levelTime, [Validators.required]], // should be weight level change and level time is not used at all
      cleaningTime: [this.hotelSettings.cleaningTime, [Validators.required]], // should be weight credits

      weightLevelChange: [this.hotelSettings.weightLevelChange, [Validators.required]],
      weightCredits: [this.hotelSettings.weightCredits, [Validators.required]],
      minutesPerCredit: [this.hotelSettings.minutesPerCredit, [Validators.required]],
      minCreditsForMultipleCleanersCleaning: [this.hotelSettings.minCreditsForMultipleCleanersCleaning, [Validators.required]],

    });

    this.levelsDistanceMatrixExists$.next(this.hotelSettings.levelsDistanceMatrixExists);
    this.buildingsDistanceMatrixExists$.next(this.hotelSettings.buildingsDistanceMatrixExists);
  }

  saveHotelSettings() {
    if (!this.settingsForm.valid) {
      this.settingsForm.markAllAsTouched();
      this.settingsForm.markAsDirty({ onlySelf: false });
      this._toastr.error("You have to fix form errors before you can continue.");
      return;
    }

    let saveCommand: SaveHotelSettingsCommand = new SaveHotelSettingsCommand({
      ...this.settingsForm.getRawValue()
    });

    this.saved.next(saveCommand);
  }

  uploadBuildingDistanceMatrix(event) {
    this.onFileSelected(event, DistanceMatrixType.BUILDING, this.hotel.id);
  }

  uploadFloorDistanceMatrix(event) {
    this.onFileSelected(event, DistanceMatrixType.FLOOR, this.hotel.id);
  }


  onFileSelected(event, distanceMatrixType: DistanceMatrixType, hotelId: string) {
    if (event.target.files.length > 0) {
      this.loading.start();

      const file: File = event.target.files[0];
      if (file.type !== "text/plain") {
        this._toastr.warning("Only plan .txt files are supported.");
        this.loading.stop();
        return;
      }

      const formData: FormData = new FormData();
      formData.append(`file`, file);

      this.hotelClient.uploadDistanceMatrix(<FileParameter>{ data: file, fileName: "distanceMatrix.txt" }, hotelId, distanceMatrixType).subscribe(
        (response: ProcessResponse) => {
          if (response.hasError) {
            this._toastr.error(response.message);
          }
          else {
            this._toastr.success(response.message);

            if (distanceMatrixType == DistanceMatrixType.BUILDING) {
              this.buildingsDistanceMatrixExists$.next(true);
            }
            else {
              this.levelsDistanceMatrixExists$.next(true);
            }
          }
        },
        (error: Error) => { this._toastr.error(error.message); },
        () => { this.loading.stop(); }
      );
    }
  }

}