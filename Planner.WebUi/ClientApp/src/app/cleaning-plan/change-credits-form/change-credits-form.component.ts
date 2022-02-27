import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { ChangePlannableCleaningsCreditsCommand, CleaningPlanClient, CleaningTimelineItemData, CreateCustomPlannableCleaningsCommand, InsertRoomCategoryCommand, IProcessResponse, IProcessResponseOfIEnumerableOfCleaningTimelineItemData, ProcessResponse, ProcessResponseOfGuid, RoomCategoryDetailsViewModel, RoomCategoryManagementClient, TaskWhereData, UpdateRoomCategoryCommand } from '../../core/autogenerated-clients/api-client';
import { LoadingService } from '../../core/services/loading.service';
import moment, { Moment } from 'moment';
import { MomentDateHelper } from '../../shared/helpers/moment-date.helper';

@Component({
  selector: 'app-change-credits-form',
  templateUrl: './change-credits-form.component.html'
})
export class ChangeCreditsFormComponent implements OnInit, OnChanges {

  @Input() cleanings: Array<CleaningTimelineItemData> = [];

  @Output() saved: EventEmitter<{ cleaningIds: string[], credits: number }> = new EventEmitter<{ cleaningIds: string[], credits: number }>();
  @Output() cancelled: EventEmitter<boolean> = new EventEmitter<boolean>();

  isSaving$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  changeCreditsForm: FormGroup;
  loading: LoadingService;

  constructor(
    private _router: Router,
    private _toastr: ToastrService,
    private _formBuilder: FormBuilder,
    private _cleaningPlanClient: CleaningPlanClient
  ) {
    this.loading = new LoadingService();
  }

  ngOnInit(): void {
    this.changeCreditsForm = this._formBuilder.group({
      credits: [0, Validators.required],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    //if (changes.category && !changes.category.firstChange) {
    //  this._setCreateNewStatus(); 
    //  this._setCategoryFormData();
    //}
  }

  cancel() {
    this.cancelled.next(true);
  }

  save() {
    if (!this.changeCreditsForm.valid) {
      this.changeCreditsForm.markAllAsTouched();
      this.changeCreditsForm.markAsDirty({ onlySelf: false });
      this._toastr.error("You have to fix form errors before you can continue.");
      return;
    }

    this.loading.start();

    let formValues = this.changeCreditsForm.getRawValue();

    let request: ChangePlannableCleaningsCreditsCommand = new ChangePlannableCleaningsCreditsCommand({
      credits: +formValues.credits,
      ids: this.cleanings.map(c => c.id),
    });

    this._cleaningPlanClient.changePlannableCleaningsCredits(request).subscribe(
      (response: ProcessResponse) => {
        if (response.hasError) {
          this._toastr.error(response.message);
          this.loading.stop();
          return;
        }

        this._toastr.success(response.message);
        this.saved.next({ cleaningIds: request.ids, credits: request.credits });
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
