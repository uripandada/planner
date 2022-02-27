import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AutomaticHousekeepingUpdateCleaningStatusTo, AutomaticHousekeepingUpdateCleaningStatusWhen, AutomaticHousekeepingUpdatesClient, DeleteAutomaticHousekeepingUpdateSettingsCommand, HotelClient, InsertAutomaticHousekeepingUpdateSettingsCommand, ProcessResponse, ProcessResponseOfGuid, SaveAutomaticHousekeepingUpdateSettings, UpdateAutomaticHousekeepingUpdateSettingsCommand } from '../../core/autogenerated-clients/api-client';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-auto-housekeeping-settings-details',
  templateUrl: './auto-housekeeping-settings-details.component.html',
  styleUrls: ['./auto-housekeeping-settings-details.component.scss'],

})
export class AutoHousekeepingSettingsDetailsComponent implements OnInit, OnChanges, OnDestroy {

  @Input() hotelId: string;
  @Input() autoUpdateFormGroup: FormGroup;

  @Output() deleted: EventEmitter<boolean> = new EventEmitter<boolean>();

  mask = [/[0-2]/, /[0-9]/, ':', /[0-5]/, /[0-9]/];

  loading: LoadingService;

  formChangedSubscription: Subscription;

  isEditMode$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  statusDescription$: BehaviorSubject<string> = new BehaviorSubject<string>("");
  actionDescription$: BehaviorSubject<string> = new BehaviorSubject<string>("");

  listOfTos: Array<{ key: AutomaticHousekeepingUpdateCleaningStatusTo, value: string }> = [
    { key: AutomaticHousekeepingUpdateCleaningStatusTo.CLEAN, value: "Clean" },
    { key: AutomaticHousekeepingUpdateCleaningStatusTo.DIRTY, value: "Dirty" },
  ];
  listOfWhens: Array<{ key: AutomaticHousekeepingUpdateCleaningStatusWhen, value: string }> = [
    { key: AutomaticHousekeepingUpdateCleaningStatusWhen.EVERY_DAY, value: "Every day" },
    { key: AutomaticHousekeepingUpdateCleaningStatusWhen.ON_CLEANING_DAY, value: "On cleaning day" },
  ];

  constructor(
    private _formBuilder: FormBuilder,
    private _toastr: ToastrService,
    private _cookieService: CookieService,
    private _hotelClient: HotelClient,
    private _route: ActivatedRoute,
    private _autoUpdatesClient: AutomaticHousekeepingUpdatesClient
  ) {
    this.loading = new LoadingService();
  }

  ngOnInit() {
    this.isEditMode$.next(!!this.autoUpdateFormGroup.controls.id.value);

    this.formChangedSubscription = this.autoUpdateFormGroup.valueChanges.subscribe(() => {
      this._refreshDescription();
    });
    this._refreshDescription();
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  ngOnDestroy(): void {
    this.formChangedSubscription.unsubscribe();
  }

  showEditForm() {
    this.isEditMode$.next(true);
  }

  hideEditForm() {
    this.isEditMode$.next(false);
  }

  cancel() {

  }

  save() {
    this.loading.start();

    let formValues = this.autoUpdateFormGroup.getRawValue();

    let saveRequest: SaveAutomaticHousekeepingUpdateSettings = new SaveAutomaticHousekeepingUpdateSettings({
      clean: formValues.clean,
      dirty: formValues.dirty,
      cleanNeedsInspection: formValues.cleanNeedsInspection,
      inspected: formValues.inspected,

      doDisturb: formValues.doDisturb,
      doNotDisturb: formValues.doNotDisturb,

      inService: formValues.inService,
      outOfService: formValues.outOfService,

      occupied: formValues.occupied,
      vacant: formValues.vacant,

      roomNameRegex: formValues.roomNameRegex,

      updateStatusTo: formValues.updateStatusTo,
      updateStatusWhen: formValues.updateStatusWhen,
      updateStatusAtTime: formValues.updateStatusAtTime,
      hotelId: this.hotelId,
    });

    if (this.isEditMode$.value) {
      let updateRequest: UpdateAutomaticHousekeepingUpdateSettingsCommand = new UpdateAutomaticHousekeepingUpdateSettingsCommand({ ...saveRequest, id: formValues.id });

      this._autoUpdatesClient.updateAutomaticHousekeepingUpdateSettings(updateRequest).subscribe(
        (response: ProcessResponse) => {
          if (response.hasError) {
            this._toastr.error(response.message);
            return;
          }

          this._toastr.success(response.message);
          this.isEditMode$.next(true);
        },
        (error: Error) => { this._toastr.error(error.message); },
        () => { this.loading.stop(); }
      );
    }
    else {
      let insertRequest: InsertAutomaticHousekeepingUpdateSettingsCommand = new InsertAutomaticHousekeepingUpdateSettingsCommand(saveRequest);

      this._autoUpdatesClient.insertAutomaticHousekeepingUpdateSettings(insertRequest).subscribe(
        (response: ProcessResponseOfGuid) => {
          if (response.hasError) {
            this._toastr.error(response.message);
            return;
          }

          this.autoUpdateFormGroup.controls.id.setValue(response.data);
          this._toastr.success(response.message);
          this.isEditMode$.next(true);
        },
        (error: Error) => { this._toastr.error(error.message); },
        () => { this.loading.stop(); }
      );
    }
  }

  delete() {

    if (this.isEditMode$.value) {
      this.loading.start();
      let deleteRequest: DeleteAutomaticHousekeepingUpdateSettingsCommand = new DeleteAutomaticHousekeepingUpdateSettingsCommand({
        id: this.autoUpdateFormGroup.controls.id.value,
      });
      this._autoUpdatesClient.deleteAutomaticHousekeepingUpdateSettings(deleteRequest).subscribe(
        (response: ProcessResponse) => {
          if (response.hasError) {
            this._toastr.error(response.message);
            return;
          }

          this._toastr.success(response.message);
          this.deleted.emit(true);
        },
        (error: Error) => { this._toastr.error(error.message); },
        () => { this.loading.stop(); }
      );
    }
    else {
      this.deleted.emit(true);
    }
  }

  private _refreshDescription() {
    let formValues = this.autoUpdateFormGroup.getRawValue();

    let statusDescription = "";

    if (formValues.clean === formValues.dirty && formValues.clean === formValues.cleanNeedsInspection && formValues.clean === formValues.inspected) {
      statusDescription += "any cleaning status, "
    }
    else {
      if (formValues.clean) {
        statusDescription += "clean, "
      }
      if (formValues.cleanNeedsInspection) {
        statusDescription += "need inspection, "
      }
      if (formValues.inspected) {
        statusDescription += "inspected, "
      }
      if (formValues.dirty) {
        statusDescription += "dirty, "
      }
    }

    if (formValues.occupied === formValues.vacant) {
        statusDescription += "any occupancy, "
    }
    else {
      if (formValues.occupied) {
        statusDescription += "occupied, "
      }
      else {
        statusDescription += "vacant, "
      }
    }

    if (formValues.doDisturb !== formValues.doNotDisturb) {
      if (formValues.doDisturb) {
        statusDescription += "can be disturbed, "
      }
      else {
        statusDescription += "do not disturb, "
      }
    }

    if (formValues.inService !== formValues.outOfService) {
      if (formValues.inService) {
        statusDescription += "in service, "
      }
      else {
        statusDescription += "out of service, "
      }
    }

    statusDescription = statusDescription.trim();
    if (statusDescription.endsWith(",")) {
      statusDescription = statusDescription.substr(0, statusDescription.length - 1);
    }

    if (!!formValues.roomNameRegex) {
      statusDescription += " with name like \"" + formValues.roomNameRegex + "\"";
    }

    let actionDescription = "";
    if (formValues.updateStatusTo === AutomaticHousekeepingUpdateCleaningStatusTo.CLEAN) {
      actionDescription += "clean, "
    }
    else if (formValues.updateStatusTo === AutomaticHousekeepingUpdateCleaningStatusTo.DIRTY) {
      actionDescription += "dirty, "
    }
    if (formValues.updateStatusWhen === AutomaticHousekeepingUpdateCleaningStatusWhen.EVERY_DAY) {
      actionDescription += "every day "
    }
    else if (formValues.updateStatusWhen === AutomaticHousekeepingUpdateCleaningStatusWhen.ON_CLEANING_DAY) {
      actionDescription += "at the day of cleaning "
    }
    actionDescription += "at " + formValues.updateStatusAtTime;

    this.statusDescription$.next(statusDescription);
    this.actionDescription$.next(actionDescription);
  }
}
