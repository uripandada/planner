import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { AutomationClient, HotelClient, HotelItemData, HotelSettingsData, ProcessResponseOfString, SaveHotelSettingsCommand, SetRoomsStatusCommand } from '../core/autogenerated-clients/api-client';
import { HotelService } from '../core/services/hotel.service';
import { LoadingService } from '../core/services/loading.service';

@Component({
  selector: 'app-hotels-management',
  templateUrl: './hotels-management.component.html',
  styleUrls: ['./hotels-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HotelsManagementComponent implements OnInit {

  filterForm: FormGroup;
  hotels: HotelItemData[];
  selectedHotel: HotelItemData;
  selectedHotelName: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  selectedHotelSettings: BehaviorSubject<HotelSettingsData> = new BehaviorSubject<HotelSettingsData>(null);

  isLoadingHotelSettingsDetails$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isHotelSettingsLoaded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  selectedHotel$: BehaviorSubject<HotelItemData> = new BehaviorSubject<HotelItemData>(new HotelItemData({
    id: null,
    name: 'N/A'
  }));
  hotelSettingsDetails$: BehaviorSubject<HotelSettingsData> = new BehaviorSubject<HotelSettingsData>(null);

  areDetailsDisplayed$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private hotelService: HotelService,
    private hotelClient: HotelClient,
    private _automationClient: AutomationClient,
    private formBuilder: FormBuilder,
    public loading: LoadingService,
    private _toastr: ToastrService
  ) {
    this.hotels = hotelService.getHotels();
  }


  ngOnInit() {
    this.filterForm = this.formBuilder.group({
      keywords: ['']
    });

    this.filterForm.controls.keywords.valueChanges.subscribe((keywords: string) => {
      if (keywords.length > 0) {
        this.hotels = this.hotelService.getHotels().filter(x => x.name.toLowerCase().includes(keywords.toLowerCase()));
      } else {
        this.hotels = this.hotelService.getHotels();
      }
    });
  }

  selectHotel(hotel: HotelItemData) {
    this.loading.start();
    this.isLoadingHotelSettingsDetails$.next(true);

    this.selectedHotel = hotel;
    this.selectedHotel$.next(hotel);

    this.hotelClient.getHotelSettings(this.selectedHotel.id).subscribe(
      (response) => {
        this.selectedHotelSettings.next(response.data);
        this.selectedHotelName.next(hotel.name);

        this.hotelSettingsDetails$.next(response.data);
        this.isHotelSettingsLoaded$.next(true);

        this.areDetailsDisplayed$.next(true);
      },
      (error: Error) => { this._toastr.error(error.message); },
      () => {
        this.loading.stop();
        this.isLoadingHotelSettingsDetails$.next(false);
      },
    );
  }

  onHotelSettingsSaved(command: SaveHotelSettingsCommand) {
    this.loading.start();

    this.hotelClient.saveHotelSettings(command).subscribe(
      (response: ProcessResponseOfString) => {
        if (response.isSuccess) {

          let hotelSettingsDetails: HotelSettingsData = new HotelSettingsData({
            ...this.hotelSettingsDetails$.value,
            ...command,
            id: response.data
          });

          this._toastr.success(response.message);
          this.hotelSettingsDetails$.next(hotelSettingsDetails);
          this.isHotelSettingsLoaded$.next(true);
        } else {
          this._toastr.error(response.message);
        }
      },
      (error) => {
        this._toastr.error(error);
      },
      () => { this.loading.stop();}
    );
  }

  onCancelled() {
    this.areDetailsDisplayed$.next(false);
    this.selectedHotel$.next(new HotelItemData({
      id: null,
      name: 'N/A'
    }));
  }

  nightlyUpdateHkStatuses() {
    this.loading.start();

    this._automationClient.changeNightlyRoomStatuses(new SetRoomsStatusCommand({ overrideMidnightTime: true })).subscribe(
      (isSuccess: boolean) => {
        if (!isSuccess) {
          this._toastr.error("Error happened.");
          return;
        }

        this._toastr.success("Finished room HK updates");
      },
      (error: Error) => {
        this._toastr.error(error.message);
        this.loading.stop();
      },
      () => {
        this.loading.stop();
      }

    );
  }
}
