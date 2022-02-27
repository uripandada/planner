import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AssetAvailability, AssetAvailabilityItem, AssetData, AssetDetailsGroupData, AssetGridItemData, AssetGroupAvailability, AssetManagementClient, DispatchAssetFromWarehouseCommand, GetAssetAvailabilityAndUsageQuery, GetListOfWarehousesQuery, GetPageOfAssetsQuery, GetPageOfWarehouseInventoryArchivesQuery, GetWarehouseAssetGroupsQuery, InsertAssetGroupCommand, InsertWarehouseCommand, PageOfOfAssetGridItemData, PageOfOfWarehouseInventoryArchiveItem, ProcessResponse, ProcessResponseOfGuid, ReceiveAssetToWarehouseCommand, UpdateAssetGroupCommand, UpdateWarehouseCommand, WarehouseAsset, WarehouseAssetGroup, WarehouseData, WarehouseDetailsData, WarehouseInventoryArchiveItem, WarehouseManagementClient } from '../../core/autogenerated-clients/api-client';
import { HotelService } from '../../core/services/hotel.service';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-warehouse-inventory-archive',
  templateUrl: './warehouse-inventory-archive.component.html',
})
export class WarehouseInventoryArchiveComponent implements OnInit {

  @Input() warehouseDetails: WarehouseDetailsData = null;

  items$: BehaviorSubject<WarehouseInventoryArchiveItem[]> = new BehaviorSubject<WarehouseInventoryArchiveItem[]>([]);
  totalNumberOfItems$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  loadedNumberOfItems$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  showLoadMore$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  loading: LoadingService;

  filterForm: FormGroup;
  noImageBackgroundUrl: string = "assets/images/no_image_400x400.jpg";

  sorts: { key: string, value: string }[] = [
    { key: "CREATED_AT_DESC", value: "Newest first" },
    { key: "CREATED_AT_ASC", value: "Oldest first" },
    { key: "NAME_ASC", value: "From A to Z" },
    { key: "NAME_DESC", value: "From Z to A" },
    { key: "USERNAME_ASC", value: "Created by from A to Z" },
    { key: "USERNAME_DESC", value: "Created by from Z to A" },
  ];

  constructor(
    private _formBuilder: FormBuilder,
    private _toastr: ToastrService,
    private _route: ActivatedRoute,
    private _hotelService: HotelService,
    private _warehouseClient: WarehouseManagementClient,
    private _assetsClient: AssetManagementClient) {
    this.loading = new LoadingService();
  }

  ngOnInit(): void {
    this.filterForm = this._formBuilder.group({
      sortKey: ["CREATED_AT_DESC"],
      keywords: [""],
    });

    this.filterForm.valueChanges
      .pipe(
        debounceTime(250)
      )
      .subscribe(values => {
        this._loadPageOfData(0);
      });

    this._loadPageOfData(0);
  }

  loadMore() {
    this._loadPageOfData(this.loadedNumberOfItems$.value);
  }

  private _loadPageOfData(skip: number) {
    this.loading.start();

    let query: GetPageOfWarehouseInventoryArchivesQuery = new GetPageOfWarehouseInventoryArchivesQuery({
      warehouseId: this.warehouseDetails.id,
      skip: skip,
      take: 40,
      keywords: this.filterForm.controls.keywords.value,
      sortKey: this.filterForm.controls.sortKey.value,
    });

    this._warehouseClient.getPageOfWarehouseInventoryArchives(query).subscribe((response: PageOfOfWarehouseInventoryArchiveItem) => {
      if (skip === 0) {
        this.items$.next([...response.items]);
      }
      else {
        this.items$.next([...this.items$.value, ...response.items]);
      }
      this.totalNumberOfItems$.next(response.totalNumberOfItems);
      this.loadedNumberOfItems$.next(this.items$.value.length);
      this.showLoadMore$.next(this.totalNumberOfItems$.value > this.loadedNumberOfItems$.value);

      this.loading.stop();
    },
      (error: Error) => { this.loading.stop(); }
    );
  }
}
