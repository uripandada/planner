import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Subscription } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { DashboardClient, GetRoomHistoryQuery, GetRoomMessagesFilterValuesQuery, GetRoomViewDashboardFilterValue, GetRoomViewDashboardQuery, HotelItemData, RealTimeCleaningPlannerCleaningChangedMessage, RealTimeMessagesChangedMessage, RealTimeRefreshRoomsOverviewDashboardMessage, RealTimeUserOnDutyChangedMessage, RoomHistoryItem, RoomManagementClient, RoomMessageClient, RoomMessageFilterValues, RoomViewDashboard, RoomViewDashboardRoomItem } from 'src/app/core/autogenerated-clients/api-client';
import { HotelService } from '../../core/services/hotel.service';
import { LoadingService } from '../../core/services/loading.service';
import { RealTimeCleaningsService, RealTimeRoomsOverviewService } from '../../core/services/signalr.service';
import { MasterFilterValue } from '../../shared/components/master-filter-multiselect/master-filter-multiselect.component';

@Component({
  selector: 'app-rooms-view-dashboard',
  templateUrl: './rooms-view-dashboard.component.html'
})
export class RoomsViewDashboardComponent implements OnInit, OnDestroy {

  //filterForm: FormGroup;
  sortControl: FormControl;
  hotelIdControl: FormControl;
  spaceAccessTypeKeyControl: FormControl;
  selectedMasterFilterValues: MasterFilterValue[] = [];

  loading: LoadingService;
  realTimeService: RealTimeRoomsOverviewService;
  realTimeCleaningsService: RealTimeCleaningsService;
  sorts = [
    { key: 'ORDINAL_NUMBER_ASC', value: 'Predefined order' },
    { key: 'ORDINAL_NUMBER_DESC', value: 'Reversed predefined order' },
    { key: 'NAME_ASC', value: 'Room A to Z' },
    { key: 'NAME_DESC', value: 'Room Z to A' },
  ];
  cleaningStatuses = [
    { key: 'ALL', value: 'Clean and dirty' },
    { key: 'ONLY_CLEAN', value: 'Only clean' },
    { key: 'ONLY_DIRTY', value: 'Only dirty' },
  ];
  reservationStatuses = [
    { key: 'ALL', value: 'Vacant and occupied' },
    { key: 'ONLY_OCCUPIED', value: 'Only occupied' },
    { key: 'ONLY_VACANT', value: 'Only vacant' },
  ];
  spaceAccessTypes = [
    { key: 'ALL', value: 'Public, private and temporary spaces' },
    { key: 'ONLY_PUBLIC', value: 'Only public spaces' },
    { key: 'ONLY_PRIVATE', value: 'Only bedroom spaces' },
    { key: 'ONLY_TEMPORARY', value: 'Only temporary spaces' },
  ];

  showLoadMore$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  loadedNumber$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  totalNumber$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  rooms$: BehaviorSubject<RoomViewDashboardRoomItem[]> = new BehaviorSubject<RoomViewDashboardRoomItem[]>([]);
  hotels: Array<HotelItemData>;

  refreshDashboardSubscription: Subscription;
  cleaningsChangedSubscription: Subscription;
  roomMessagesChangedSubscription: Subscription;

  showRoomMessages$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  selectedRoomMessagesRoom$: BehaviorSubject<RoomViewDashboardRoomItem> = new BehaviorSubject<RoomViewDashboardRoomItem>(null);


  showRoomHistory$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  selectedRoom$: BehaviorSubject<RoomViewDashboardRoomItem> = new BehaviorSubject<RoomViewDashboardRoomItem>(null);
  roomHistoryItems$: BehaviorSubject<RoomHistoryItem[]> = new BehaviorSubject<RoomHistoryItem[]>([]);
  selectedBedHistoryId$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  showRoomBedsHistory$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  isLoadingRoomMessagesFilterValues$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  roomMessagesFilterValues$: BehaviorSubject<RoomMessageFilterValues> = new BehaviorSubject<RoomMessageFilterValues>(new RoomMessageFilterValues({ placesFilterValues: [], reservationsFilterValues: [], todayFilterValues: [] }));
  areRoomMessagesFilterValuesLoaded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private _formBuilder: FormBuilder,
    private _toastr: ToastrService,
    private _dashboardClient: DashboardClient,
    private _roomManagementClient: RoomManagementClient,
    private _roomMessageClient: RoomMessageClient,
    private _hotelService: HotelService,

  ) {
    this.loading = new LoadingService();
    this.realTimeService = new RealTimeRoomsOverviewService();
    this.realTimeCleaningsService = new RealTimeCleaningsService();
  }

  ngOnInit() {
    this.hotels = this._hotelService.getHotels();

    this.sortControl = new FormControl("ORDINAL_NUMBER_ASC");
    this.spaceAccessTypeKeyControl = new FormControl("ONLY_PRIVATE");
    this.hotelIdControl = new FormControl(this._hotelService.getSelectedHotelId());

    this.hotelIdControl.valueChanges.pipe(
      map(hotelId => {
        this._hotelService.selectHotelId(hotelId);
        return hotelId;
      }),
      debounceTime(300)
    ).subscribe((hotelId: string) => {
      this._loadData(0);
      this._loadRoomMessagesFilterValues();
    });

    this.sortControl.valueChanges
      .pipe(
        debounceTime(300)
      )
      .subscribe((hotelId: string) => {
        this._loadData(0);
      });
    
    this.spaceAccessTypeKeyControl.valueChanges
      .pipe(
        debounceTime(300)
      )
      .subscribe((hotelId: string) => {
        this._loadData(0);
      });

    this._loadData(0);
    this._loadRoomMessagesFilterValues();

    this._connectToSignalREndpoints();
  }

  private _loadRoomMessagesFilterValues() {
    this.isLoadingRoomMessagesFilterValues$.next(true);
    this.areRoomMessagesFilterValuesLoaded$.next(false);

    let query: GetRoomMessagesFilterValuesQuery = new GetRoomMessagesFilterValuesQuery({
      hotelId: this._hotelService.getSelectedHotelId()
    });

    this._roomMessageClient.getRoomMessagesFilterValues(query).subscribe(
      (response: RoomMessageFilterValues) => {
        this.roomMessagesFilterValues$.next(response);
        this.areRoomMessagesFilterValuesLoaded$.next(true);
      },
      (error: Error) => { this._toastr.error(error.message); },
      () => { this.isLoadingRoomMessagesFilterValues$.next(false); }
    );
  }

  ngOnDestroy(): void {
    this._disconnectFromSignalREndpoints();
  }

  loadMore() {
    this._loadData(this.loadedNumber$.value);
  }

  loadAllRooms() {
    this._loadData(this.loadedNumber$.value, 100000);
  }

  showRoomHistory(room: RoomViewDashboardRoomItem) {
    this.selectedRoom$.next(room);
    this.showRoomBedsHistory$.next(room.showBeds);
    this.selectedBedHistoryId$.next(null);
    this.showRoomHistory$.next(true);

    this._loadRoomHistory(room.id, null);
  }

  onRoomHistoryClosed() {
    this.showRoomHistory$.next(false);
    this.selectedBedHistoryId$.next(null);
    this.showRoomBedsHistory$.next(false);
    this.selectedRoom$.next(null);
  }

  showRoomMessages(room: RoomViewDashboardRoomItem) {
    this.selectedRoomMessagesRoom$.next(room);
    this.showRoomMessages$.next(true);
  }

  onRoomMessagesClosed() {
    this.showRoomMessages$.next(false);
    this.selectedRoomMessagesRoom$.next(null);
  }

  selectRoomBedHistory(bedId: string) {
    this.selectedBedHistoryId$.next(bedId);

    let roomId = this.selectedRoom$.value.id;
    this._loadRoomHistory(roomId, bedId);
  }

  masterFilterChanged(values: MasterFilterValue[]) {
    this.selectedMasterFilterValues = values;
    this._loadData(0);
  }

  private _loadRoomHistory(roomId: string, bedId: string) {
    this.loading.start();
    let request: GetRoomHistoryQuery = new GetRoomHistoryQuery({ roomId: roomId, bedId: bedId });
    this._roomManagementClient.getRoomHistory(request).subscribe(
      (items: RoomHistoryItem[]) => { this.roomHistoryItems$.next(items || []); },
      (error: Error) => { this._toastr.error(error.message); },
      () => { this.loading.stop(); }
    )
  }

  private _connectToSignalREndpoints() {
    this.realTimeService.connect()
      .catch((error) => {
        this._toastr.error((error ? error : "") + "Error happened while connecting to the Rooms overview SignalR endpoint.");
        console.log(error);
      })
      .finally(() => { });

    this.refreshDashboardSubscription = this.realTimeService.refreshRoomsOverviewDashboard.subscribe((message: RealTimeRefreshRoomsOverviewDashboardMessage) => {
      if (!message || !message.roomIds || message.roomIds.length === 0)
        return;

      let rooms = this.rooms$.value;
      let refreshRooms = false;
      for (let roomId of message.roomIds) {
        if (rooms.find(r => r.id === roomId)) {
          refreshRooms = true;
          break;
        }
      }

      if (refreshRooms) {
        this._refreshLoadedData();
      }
    });

    this.realTimeCleaningsService.connect()
      .catch((error) => {
        this._toastr.error((error ? error : "") + "Error happened while connecting to the Cleanings SignalR endpoint.");
        console.log(error);
      })
      .finally(() => { });

    this.cleaningsChangedSubscription = this.realTimeCleaningsService.cleaningsChanged.subscribe((messages: Array<RealTimeCleaningPlannerCleaningChangedMessage>) => {
      if (!messages || messages.length === 0)
        return;

      let rooms = this.rooms$.value;
      let refreshRooms = false;
      for (let message of messages) {
        if (rooms.find(r => r.id === message.roomId)) {
          refreshRooms = true;
          break;
        }
      }

      if (refreshRooms) {
        this._refreshLoadedData();
      }
    });

    this.roomMessagesChangedSubscription = this.realTimeService.roomMessagesChanged.subscribe((message: RealTimeMessagesChangedMessage) => {
      if (!message)
        return;

      let refreshRooms = false;
      if (message.roomIds && message.roomIds.length > 0) {
        let rooms = this.rooms$.value;
        for (let roomId of message.roomIds) {
          if (rooms.find(r => r.id === roomId)) {
            refreshRooms = true;
            break;
          }
        }
      }

      if (!refreshRooms && message.reservationIds && message.reservationIds.length > 0) {
        let rooms = this.rooms$.value;
        for (let room of rooms) {
          for (let reservationId of message.reservationIds) {
            if (room.reservations.find(res => res.id === reservationId)) {
              refreshRooms = true;
              break;
            }
          }

          if (refreshRooms) {
            break;
          }
        }
      }

      if (refreshRooms) {
        this._refreshLoadedData();
      }
    });
  }

  private _disconnectFromSignalREndpoints() {
    this.refreshDashboardSubscription.unsubscribe();
    this.cleaningsChangedSubscription.unsubscribe();
    this.realTimeService.disconnect();
    this.realTimeCleaningsService.disconnect();
  }

  private _refreshLoadedData() {
    this._loadData(0, this.loadedNumber$.value);
  }

  private _loadData(skip: number, take: number = 100) {
    this.loading.start();

    //let formValues = this.filterForm.getRawValue();
    let query: GetRoomViewDashboardQuery = new GetRoomViewDashboardQuery({
      skip: skip,
      take: take,
      sortKey: this.sortControl.value,
      spaceAccessTypeKey: this.spaceAccessTypeKeyControl.value,
      hotelId: this.hotelIdControl.value,
      filterValues: this.selectedMasterFilterValues.map(v => new GetRoomViewDashboardFilterValue({ type: v.type, id: v.id })),
    });

    this._dashboardClient.getRoomViewDashboard(query).subscribe(
      (response: RoomViewDashboard) => {
        if (skip === 0) {
          this.rooms$.next(response.rooms);
        } else {
          this.rooms$.next([...this.rooms$.value, ...response.rooms]);
        }
        this.totalNumber$.next(response.totalNumberOfRooms);
        this.loadedNumber$.next(this.rooms$.value.length);
        this.showLoadMore$.next(this.loadedNumber$.value < this.totalNumber$.value);
      },
      (error: Error) => {
        this._toastr.error(error.message);
      },
      () => {
        this.loading.stop();
      },
    );
  }
}
