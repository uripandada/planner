import { Component, OnInit } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { WarehouseData, WarehouseDetailsData } from '../../core/autogenerated-clients/api-client';
import { HotelService } from '../../core/services/hotel.service';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-warehouse-details',
  templateUrl: './warehouse-details.component.html',
})
export class WarehouseDetailsComponent implements OnInit {

  isEditMode$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  isCreateNew$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  warehouse$: BehaviorSubject<WarehouseDetailsData> = new BehaviorSubject<WarehouseDetailsData>(null);

  constructor(
    public loading: LoadingService,
    private _toastr: ToastrService,
    private _route: ActivatedRoute,
    private _router: Router,
    private _hotelService: HotelService
  ) { }

  ngOnInit(): void {
    let warehouse = new WarehouseDetailsData(this._route.snapshot.data.warehouse);

    this.isCreateNew$.next(warehouse.id === "00000000-0000-0000-0000-000000000000");
    this.isEditMode$.next(this.isCreateNew$.value);

    if (this.isCreateNew$.value) {
      warehouse.isCentralWarehouse = this._route.snapshot.data.isCentralWarehouse;
    }
    this.warehouse$.next(warehouse);
  }

  edit() {
    this.isEditMode$.next(true);
  }

  onWarehouseInserted(warehouseData: WarehouseData) {

    this._router.navigate(["/warehouses", "warehouse-details", warehouseData.id]);

    //let warehouse = new WarehouseDetailsData(this.warehouse$.value);
    //warehouse.name = warehouseData.name;
    //warehouse.id = warehouseData.id;

    //this.isCreateNew$.next(false);
    //this.isEditMode$.next(false);
    //this.warehouse$.next(warehouse);
  }

  onWarehouseUpdated(warehouseData: WarehouseData) {
    let warehouse = new WarehouseDetailsData(this.warehouse$.value);
    warehouse.name = warehouseData.name;

    this.isEditMode$.next(false);
    this.warehouse$.next(warehouse);
  }

  onCancelEditWarehouse() {
    if (this.isCreateNew$.value) {
      this._router.navigate(["/rooms-management"]);
    }
    else {
      this.isEditMode$.next(false);
    }
  }

  public tabChanged(eventData: MatTabChangeEvent) {
    switch (eventData.index) {
      case 0:
        // INFO TAB
        break;
      case 1:
        // MODEL TAB
        break;
      case 2:
        // ACTION
        break;
      case 3:
        // PLAN
        break;
      case 4:
        // CONTRACT
        break;
      case 5:
        // DASHBOARD
        break;
    }
  }
}
