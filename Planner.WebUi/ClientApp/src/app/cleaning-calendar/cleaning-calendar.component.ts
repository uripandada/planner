import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MAT_MOMENT_DATE_FORMATS } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import moment, { Moment } from 'moment';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { CalendarDay, CleaningCalendarClient, CleaningCalendarIntervalResult, CleaningCalendarRoom, GetWeeklyCleaningCalendarQuery, HotelItemData } from '../core/autogenerated-clients/api-client';
import { CustomDateAdapter } from '../core/custom-date-adapter';
import { HotelService } from '../core/services/hotel.service';
import { LoadingService } from '../core/services/loading.service';
import { MomentDateHelper } from '../shared/helpers/moment-date.helper';

@Component({
  selector: 'app-cleaning-calendar',
  templateUrl: './cleaning-calendar.component.html',
  styleUrls: ['./cleaning-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // `MomentDateAdapter` and `MAT_MOMENT_DATE_FORMATS` can be automatically provided by importing
    // `MatMomentDateModule` in your applications root module. We provide it at the component level
    // here, due to limitations of our example generation script.
    { provide: DateAdapter, useClass: CustomDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MAT_MOMENT_DATE_FORMATS },
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
  ],
})
export class CleaningCalendarComponent implements OnInit {
  hotels: Array<HotelItemData>;
  isCalendarLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isHotelLoaded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  calendarDays$: BehaviorSubject<CalendarDay[]> = new BehaviorSubject<CalendarDay[]>([]);

  calendarRooms$: BehaviorSubject<CleaningCalendarRoom[]> = new BehaviorSubject<CleaningCalendarRoom[]>([]);
  private _allCalendarRooms: CleaningCalendarRoom[] = [];

  private _resettingFilterForm: boolean = false;

  constructor(
    private _toastr: ToastrService,
    private _formBuilder: FormBuilder,
    public loading: LoadingService,
    private _cleaningCalendarClient: CleaningCalendarClient,
    public hotelService: HotelService) {
  }

  selectCalendarForm: FormGroup;

  ngOnInit(): void {
    this.loading.reset();
    this.hotels = this.hotelService.getHotels();
    this.selectCalendarForm = this._createSelectCalendarForm();

    if (this.hotelService.getSelectedHotelId()) {
      this._loadCleaningCalendar();
      this.isHotelLoaded$.next(true);
    }
  }

  private _createSelectCalendarForm(): FormGroup {
    let form: FormGroup = this._formBuilder.group({
      dateFrom: [moment().startOf('week').add(1, 'day')],
      dateTo: [moment().startOf('week').add(7, 'day')],
      keywords: [""],
      hotelId: [this.hotelService.getSelectedHotelId()],
    });

    // On group change, load the hotels
    form.controls.hotelId.valueChanges.subscribe((hotelId: string) => {
      let isHotelLoaded: boolean = hotelId !== null && hotelId !== undefined;
      this.isHotelLoaded$.next(isHotelLoaded);

      if (isHotelLoaded) {
        this._loadCleaningCalendar();
      }
    });

    form.controls.keywords.valueChanges
      .pipe(
        debounceTime(250)
      )
      .subscribe((keywords: string) => {
        if (this._resettingFilterForm)
          return;

        this._filterCleaningCalendar(keywords);
      });

    return form;
  }

  onWeekChanged(weekDates: { startDate: Moment, endDate: Moment }) {
    this._loadCleaningCalendar();
  }

  nextWeek() {
    let startDate: Moment = this.selectCalendarForm.controls.dateFrom.value;
    let nextWeekStartDate = startDate.clone().add(7, 'day');
    let nextWeekEndDate = nextWeekStartDate.clone().add(7, 'day');

    this.selectCalendarForm.controls.dateFrom.setValue(nextWeekStartDate);
    this.selectCalendarForm.controls.dateTo.setValue(nextWeekEndDate);

    this._loadCleaningCalendar();
  }

  previousWeek() {
    let startDate: Moment = this.selectCalendarForm.controls.dateFrom.value;
    let previousWeekStartDate = startDate.clone().subtract(7, 'day');
    let previousWeekEndDate = startDate.clone();

    this.selectCalendarForm.controls.dateFrom.setValue(previousWeekStartDate);
    this.selectCalendarForm.controls.dateTo.setValue(previousWeekEndDate);

    this._loadCleaningCalendar();
  }

  private _loadCleaningCalendar() {
    let formValues = this.selectCalendarForm.getRawValue();

    if (!formValues.hotelId) {
      return;
    }

    let keywordsValue = formValues.keywords;

    let request: GetWeeklyCleaningCalendarQuery = new GetWeeklyCleaningCalendarQuery({
      fromDate: MomentDateHelper.getDateAtMidnight(formValues.dateFrom),
      toDate: MomentDateHelper.getDateAtMidnight(formValues.dateTo),
      hotelId: formValues.hotelId,
    });

    this._cleaningCalendarClient.getWeeklyCleaningCalendar(request).subscribe((calendar: CleaningCalendarIntervalResult) => {
      this.calendarDays$.next(calendar.days);
      this._allCalendarRooms = calendar.rooms;
      this.calendarRooms$.next(calendar.rooms);

      this._filterCleaningCalendar(keywordsValue);
    });
  }

  private _filterCleaningCalendar(keywords: string) {
    let rooms = this._allCalendarRooms.filter(r =>
      r.name.indexOf(keywords) >= 0 // if the room name contains the keywords
      ||
      (r.days.filter(d =>
        (d.reservations.filter(re => re.guestName.indexOf(keywords) >= 0)).length > 0
        ||
        (d.cleanings.filter(cl => cl.cleaningName.indexOf(keywords) >= 0)).length > 0
      )).length > 0);
    this.calendarRooms$.next(rooms);
  }

}
