import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { InsertWarehouseCommand, ProcessResponse, ProcessResponseOfGuid, UpdateWarehouseCommand, WarehouseData, WarehouseDetailsData, WarehouseManagementClient } from '../../core/autogenerated-clients/api-client';
import { HotelService } from '../../core/services/hotel.service';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-warehouse-edit-form',
  templateUrl: './warehouse-edit-form.component.html',
})
export class WarehouseEditFormComponent implements OnInit {

  @Input() warehouse: WarehouseDetailsData;
  
  @Output() deleted: EventEmitter<string> = new EventEmitter<string>();
  @Output() inserted: EventEmitter<WarehouseData> = new EventEmitter<WarehouseData>();
  @Output() updated: EventEmitter<WarehouseData> = new EventEmitter<WarehouseData>();
  @Output() cancelled: EventEmitter<boolean> = new EventEmitter<boolean>();

  public isCreateNew: boolean = true;
  public warehouseForm: FormGroup;

  isSaving$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    public loading: LoadingService,
    private _formBuilder: FormBuilder,
    private _toastr: ToastrService,
    private _hotelService: HotelService,
    private _warehouseClient: WarehouseManagementClient) { }

  ngOnInit(): void {
    this.isCreateNew = !this.warehouse.id || this.warehouse.id === "00000000-0000-0000-0000-000000000000";

    this._createWarehouseForm();
  }

  cancel() {
    this.cancelled.next(true);
  }

  save() {
    if (!this.warehouseForm.valid) {
      this._toastr.error("You have to fix form errors before you can continue.");
      this.warehouseForm.markAllAsTouched();
      this.warehouseForm.markAsDirty({ onlySelf: false });
      return;
    }

    this.isSaving$.next(true);
    this.loading.start();

    let formValues = this.warehouseForm.getRawValue();
    if (this.isCreateNew) {

      let insertRequest: InsertWarehouseCommand = new InsertWarehouseCommand({
        name: formValues.name,
        isCentralWarehouse: this.warehouse.isCentralWarehouse,
        hotelId: this.warehouse.hotelId,
        floorId: this.warehouse.floorId,
      });

      this._warehouseClient.insertWarehouse(insertRequest).subscribe(
        (response: ProcessResponseOfGuid) => {
          if (response.hasError) {
            this._toastr.error(response.message);
          }
          else {
            let warehouseData: WarehouseData = new WarehouseData({
              id: response.data,
              name: insertRequest.name,
              isCentralWarehouse: this.warehouse.isCentralWarehouse,
              floorId: this.warehouse.floorId,
              floorName: this.warehouse.floorName,
              hotelId: this.warehouse.hotelId,
              hotelName: this.warehouse.hotelName,
            });

            this.inserted.next(warehouseData);
            this.warehouse = warehouseData;
            this.isCreateNew = false;
          }
          this.isSaving$.next(false);
        },
        (error: Error) => {
          this._toastr.error(error.message);
          this.isSaving$.next(false);
        },
        () => {
          this.loading.stop();
          this.isSaving$.next(false);
        }
      );
    }
    else {

      let updateRequest: UpdateWarehouseCommand = new UpdateWarehouseCommand({
        name: formValues.name,
        id: this.warehouse.id,
        isCentralWarehouse: this.warehouse.isCentralWarehouse,
        hotelId: this.warehouse.hotelId,
        floorId: this.warehouse.floorId,
      });

      this._warehouseClient.updateWarehouse(updateRequest).subscribe(
        (response: ProcessResponse) => {
          if (response.hasError) {
            this._toastr.error(response.message);
          }
          else {
            let warehouseData: WarehouseData = new WarehouseData({
              name: updateRequest.name,
              id: this.warehouse.id,
              isCentralWarehouse: this.warehouse.isCentralWarehouse,
              floorId: this.warehouse.floorId,
              floorName: this.warehouse.floorName,
              hotelId: this.warehouse.hotelId,
              hotelName: this.warehouse.hotelName,
            });

            this.updated.next(warehouseData);
            this.warehouse = warehouseData;
            this.isCreateNew = false;
          }
          this.isSaving$.next(false);
        },
        (error: Error) => {
          this._toastr.error(error.message);
          this.isSaving$.next(false);
        },
        () => {
          this.loading.stop();
          this.isSaving$.next(false);
        }
      );
    }
  }

  private _createWarehouseForm() {
    this.warehouseForm = this._formBuilder.group({
      name: [this.warehouse.name, Validators.required],
    });
  }
}
