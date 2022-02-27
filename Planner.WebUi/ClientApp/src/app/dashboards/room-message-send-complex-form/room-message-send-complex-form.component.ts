import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { InsertComplexMessageCommand, ProcessResponse, ProcessResponseOfGuid, RoomMessageClient, RoomMessageDateType, RoomMessageDetails, RoomMessageFilterGroup, RoomMessageFilterValues, RoomMessageForType, RoomMessageType, RoomViewDashboardBedItem, RoomViewDashboardRoomItem, SaveComplexRoomMessage, SaveRoomMessageFilter, UpdateComplexMessageCommand } from 'src/app/core/autogenerated-clients/api-client';
import { HotelService } from '../../core/services/hotel.service';
import moment, { Moment } from 'moment';

@Component({
  selector: 'app-room-message-send-complex-form',
  templateUrl: './room-message-send-complex-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoomMessageSendComplexFormComponent implements OnInit, OnChanges {

  @Input() room: RoomViewDashboardRoomItem | RoomViewDashboardBedItem;
  @Input() filterValues: RoomMessageFilterValues;
  @Input() messageDetails: RoomMessageDetails;

  @Output() simpleModeSet: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() saved: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() cancelled: EventEmitter<boolean> = new EventEmitter<boolean>();

  messageForm: FormGroup;

  roomMessageForType: typeof RoomMessageForType = RoomMessageForType;
  roomMessageDateType: typeof RoomMessageDateType = RoomMessageDateType;

  whereGroups$: BehaviorSubject<RoomMessageFilterGroup[]> = new BehaviorSubject<RoomMessageFilterGroup[]>([]);

  isEditMode$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  get selectedFilterValuesFormArray(): FormArray {
    return this.messageForm.get('filterValues') as FormArray;
  }

  constructor(
    private _roomMessageClient: RoomMessageClient,
    private _formBuilder: FormBuilder,
    private _toastr: ToastrService,
    private _hotelService: HotelService,
  ) {
  }
  ngOnInit() {

    this.isEditMode$.next(!!this.messageDetails.id);

    this.messageForm = this._formBuilder.group({
      message: [this.messageDetails.message, [Validators.required]],
      forType: [this.messageDetails.forType, [Validators.required]],
      dateType: [this.messageDetails.dateType, [Validators.required]],
      intervalStartDate: [this.messageDetails.intervalStartDate?.toDate()],
      intervalEndDate: [this.messageDetails.intervalEndDate?.toDate()],
      intervalEveryNumberOfDays: [this.messageDetails.intervalNumberOfDays],
      reservationOnArrivalDate: [this.messageDetails.reservationOnArrivalDate],
      reservationOnDepartureDate: [this.messageDetails.reservationOnDepartureDate],
      reservationOnStayDates: [this.messageDetails.reservationOnStayDates],
      filterValues: this._formBuilder.array(this.messageDetails.roomMessageFilters.map(f => this._formBuilder.group({
        referenceId: f.referenceId,
        referenceDescription: f.referenceDescription,
        referenceName: f.referenceName,
        referenceType: f.referenceType,
      })), [Validators.required]),
      dates: this._formBuilder.array(this.messageDetails.dates.map(d => this._formBuilder.control(d.toDate()))),
    });


    this.messageForm.controls.forType.valueChanges.subscribe((forType: RoomMessageForType) => {
      this._setWheres(forType);
      this._setFormValidators();
      (this.messageForm.controls.filterValues as FormArray).clear();
    });

    this.messageForm.controls.dateType.valueChanges.subscribe((forType: RoomMessageForType) => {
      this._setFormValidators();
    });

    this._setWheres(RoomMessageForType.TODAY);
    this._setFormValidators();
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes.messageDetails && !changes.messageDetails.firstChange) {

      let d: RoomMessageDetails = changes.messageDetails.currentValue;

      this.isEditMode$.next(!!d.id);

      this.messageForm.controls.message.setValue(d.message);
      this.messageForm.controls.forType.setValue(d.forType);
      this.messageForm.controls.dateType.setValue(d.dateType);
      this.messageForm.controls.intervalStartDate.setValue(d.intervalStartDate?.toDate());
      this.messageForm.controls.intervalEndDate.setValue(d.intervalEndDate?.toDate());
      this.messageForm.controls.intervalEveryNumberOfDays.setValue(d.intervalNumberOfDays);
      this.messageForm.controls.reservationOnArrivalDate.setValue(d.reservationOnArrivalDate);
      this.messageForm.controls.reservationOnDepartureDate.setValue(d.reservationOnDepartureDate);
      this.messageForm.controls.reservationOnStayDates.setValue(d.reservationOnStayDates);

      (this.messageForm.controls.filterValues as FormArray).clear();
      for (let f of d.roomMessageFilters) {
        (this.messageForm.controls.filterValues as FormArray).push(this._formBuilder.group({
          referenceId: [f.referenceId],
          referenceDescription: [f.referenceDescription],
          referenceName: [f.referenceName],
          referenceType: [f.referenceType],
        }));
      }
      //this.messageForm.controls.filterValues = this._formBuilder.array(d.roomMessageFilters.map(f => this._formBuilder.group({
      //  referenceId: f.referenceId,
      //  referenceDescription: f.referenceDescription,
      //  referenceName: f.referenceName,
      //  referenceType: f.referenceType,
      //})), [Validators.required]);
      (this.messageForm.controls.dates as FormArray).clear();
      for (let date of d.dates) {
        (this.messageForm.controls.dates as FormArray).push(this._formBuilder.control(date.toDate()));
      }

      this._setWheres(d.forType);
      this._setFormValidators();
    }
  }

  private _setFormValidators() {
    let forType: RoomMessageForType = this.messageForm.controls.forType.value;
    let dateType: RoomMessageDateType = this.messageForm.controls.dateType.value;

    if (forType === RoomMessageForType.TODAY) {
      this.messageForm.controls.reservationOnArrivalDate.setValidators([]);
      this.messageForm.controls.reservationOnArrivalDate.updateValueAndValidity();
      this.messageForm.controls.reservationOnDepartureDate.setValidators([]);
      this.messageForm.controls.reservationOnDepartureDate.updateValueAndValidity();
      this.messageForm.controls.reservationOnStayDates.setValidators([]);
      this.messageForm.controls.reservationOnStayDates.updateValueAndValidity();
      this.messageForm.controls.dates.setValidators([]);
      this.messageForm.controls.dates.updateValueAndValidity();
      this.messageForm.controls.intervalStartDate.setValidators([]);
      this.messageForm.controls.intervalStartDate.updateValueAndValidity();
      this.messageForm.controls.intervalEndDate.setValidators([]);
      this.messageForm.controls.intervalEndDate.updateValueAndValidity();
      this.messageForm.controls.intervalEveryNumberOfDays.setValidators([]);
      this.messageForm.controls.intervalEveryNumberOfDays.updateValueAndValidity();

    }
    else if (forType === RoomMessageForType.RESERVATIONS) {
      this.messageForm.controls.reservationOnArrivalDate.setValidators([Validators.required]);
      this.messageForm.controls.reservationOnArrivalDate.updateValueAndValidity();
      this.messageForm.controls.reservationOnDepartureDate.setValidators([Validators.required]);
      this.messageForm.controls.reservationOnDepartureDate.updateValueAndValidity();
      this.messageForm.controls.reservationOnStayDates.setValidators([Validators.required]);
      this.messageForm.controls.reservationOnStayDates.updateValueAndValidity();
      this.messageForm.controls.dates.setValidators([]);
      this.messageForm.controls.dates.updateValueAndValidity();
      this.messageForm.controls.intervalStartDate.setValidators([]);
      this.messageForm.controls.intervalStartDate.updateValueAndValidity();
      this.messageForm.controls.intervalEndDate.setValidators([]);
      this.messageForm.controls.intervalEndDate.updateValueAndValidity();
      this.messageForm.controls.intervalEveryNumberOfDays.setValidators([]);
      this.messageForm.controls.intervalEveryNumberOfDays.updateValueAndValidity();
    }
    else if (forType === RoomMessageForType.PLACES) {
      this.messageForm.controls.reservationOnArrivalDate.setValidators([]);
      this.messageForm.controls.reservationOnArrivalDate.updateValueAndValidity();
      this.messageForm.controls.reservationOnDepartureDate.setValidators([]);
      this.messageForm.controls.reservationOnDepartureDate.updateValueAndValidity();
      this.messageForm.controls.reservationOnStayDates.setValidators([]);
      this.messageForm.controls.reservationOnStayDates.updateValueAndValidity();

      if (dateType === RoomMessageDateType.INTERVAL) {
        this.messageForm.controls.dates.setValidators([]);
        this.messageForm.controls.dates.updateValueAndValidity();
        this.messageForm.controls.intervalStartDate.setValidators([Validators.required]);
        this.messageForm.controls.intervalStartDate.updateValueAndValidity();
        this.messageForm.controls.intervalEndDate.setValidators([Validators.required]);
        this.messageForm.controls.intervalEndDate.updateValueAndValidity();
        this.messageForm.controls.intervalEveryNumberOfDays.setValidators([Validators.required]);
        this.messageForm.controls.intervalEveryNumberOfDays.updateValueAndValidity();
      }
      else if (dateType === RoomMessageDateType.SPECIFIC_DATES) {
        this.messageForm.controls.dates.setValidators([Validators.required]);
        this.messageForm.controls.dates.updateValueAndValidity();
        this.messageForm.controls.intervalStartDate.setValidators([]);
        this.messageForm.controls.intervalStartDate.updateValueAndValidity();
        this.messageForm.controls.intervalEndDate.setValidators([]);
        this.messageForm.controls.intervalEndDate.updateValueAndValidity();
        this.messageForm.controls.intervalEveryNumberOfDays.setValidators([]);
        this.messageForm.controls.intervalEveryNumberOfDays.updateValueAndValidity();
      }
    }
    //this.messageForm.controls.reservations.updateValueAndValidity();
    this.messageForm.updateValueAndValidity({ onlySelf: false });
    this.messageForm.markAsUntouched({ onlySelf: false });
    this.messageForm.markAsPristine({ onlySelf: false });
  }

  private _setWheres(forType: RoomMessageForType) {
    if (forType === RoomMessageForType.PLACES) {
      this.whereGroups$.next([...this.filterValues.placesFilterValues]);
    }
    else if (forType === RoomMessageForType.RESERVATIONS) {
      this.whereGroups$.next([...this.filterValues.reservationsFilterValues]);
    }
    else if (forType === RoomMessageForType.TODAY) {
      this.whereGroups$.next([...this.filterValues.todayFilterValues, ...this.filterValues.placesFilterValues]);
    }

  }

  setSimpleMode() {
    this.simpleModeSet.next(true);
  }

  save() {
    if (this.messageForm.invalid) {
      this._toastr.error('Some of the message fields are invalid.');
      this.messageForm.markAllAsTouched();
      this.messageForm.markAsDirty({ onlySelf: false });
      return;
    }

    this.isLoading$.next(true);

    let fv = this.messageForm.getRawValue();
    let baseRequest: SaveComplexRoomMessage = new SaveComplexRoomMessage({
      forType: fv.forType,
      dateType: fv.dateType,
      type: RoomMessageType.COMPLEX,
      dates: (fv.dates ?? []).map(date => (moment(date)).format("YYYY-MM-DD")),
      filters: fv.filterValues.map(f => new SaveRoomMessageFilter({
        referenceType: f.referenceType,
        referenceDescription: f.referenceDescription,
        referenceName: f.referenceName,
        referenceId: f.referenceId,
      })),
      hotelId: this._hotelService.getSelectedHotelId(),
      intervalEndDate: !!fv.intervalEndDate ? (moment(fv.intervalEndDate)).format("YYYY-MM-DD") : null,
      intervalEveryNumberOfDays: fv.intervalEveryNumberOfDays,
      intervalStartDate: !!fv.intervalStartDate ? (moment(fv.intervalStartDate)).format("YYYY-MM-DD") : null,
      message: fv.message,
      reservationOnArrivalDate: fv.reservationOnArrivalDate,
      reservationOnDepartureDate: fv.reservationOnDepartureDate,
      reservationOnStayDates: fv.reservationOnStayDates,
    });

    if (this.isEditMode$.value) {
      let request: UpdateComplexMessageCommand = new UpdateComplexMessageCommand({ ...baseRequest, id: this.messageDetails.id });
      this._roomMessageClient.updateComplexMessage(request).subscribe(
        (response: ProcessResponse) => {
          if (response.hasError) {
            this._toastr.error(response.message);
          }
          else {
            this._toastr.success(response.message);
            this.saved.next(true);
          }
        },
        (error: Error) => { this._toastr.error(error.message); },
        () => { this.isLoading$.next(false); });
    }
    else {
      let request: InsertComplexMessageCommand = new InsertComplexMessageCommand(baseRequest);
      this._roomMessageClient.insertComplexMessage(request).subscribe(
        (response: ProcessResponseOfGuid) => {
          if (response.hasError) {
            this._toastr.error(response.message);
          }
          else {
            this._toastr.success(response.message);
            this.saved.next(true);
          }
        },
        (error: Error) => { this._toastr.error(error.message); },
        () => { this.isLoading$.next(false); });
    }
  }

  cancel() {
    this.cancelled.next(true);
  }
}
