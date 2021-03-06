import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { BalancedTaskOptions, SaveMonthlyRecurringTaskItemOptions, SaveWeeklyRecurringTaskItemOptions, CancelTasksByConfigurationCommand, DailyRecurringTaskOptions, EnumData, EventTaskOptions, ExtendedTaskActionData, GetTaskConfigurationCancelPreviewQuery, GetTaskConfigurationSavePreviewQuery, InsertTaskConfigurationCommand, MonthlyRecurringTaskItemOptions, MonthlyRecurringTaskOptions, ProcessResponse, ProcessResponseOfInsertTaskConfigurationResult, ProcessResponseOfUpdateTaskConfigurationResult, SaveBalancedTaskOptions, SaveDailyRecurringTaskOptions, SaveEventTaskOptions, SaveMonthlyRecurringTaskOptions, SaveSingleTaskOptions, SaveSpecificTimesRecurringTaskOptions, SaveTaskFileData, SaveTaskWhatData, SaveWeeklyRecurringTaskOptions, SingleTaskOptions, SpecificTimesRecurringTaskOptions, TaskActionData, TaskConfigurationCancelPreview, TaskConfigurationDetailsData, TaskConfigurationSavePreview, TaskFileData, TasksManagementClient, TaskWhatData, TaskWhereData, TaskWhoData, UpdateTaskConfigurationCommand, WeeklyRecurringTaskItemOptions, WeeklyRecurringTaskOptions, RecurringEveryTaskOptions, SaveRecurringEveryTaskOptions, TaskGridItem, GetPageOfTasksForGridQuery, PageOfOfTaskGridItem } from '../../core/autogenerated-clients/api-client';
import { LoadingService } from '../../core/services/loading.service';
import { FileDetails, FilesChangedData } from '../../shared/components/file-upload/file-upload.component';
import { DateHelper } from '../../shared/helpers/date.helper';
import moment, { Moment } from 'moment';
import { MomentDateHelper } from '../../shared/helpers/moment-date.helper';
import { AutocompleteSingleSelectRequiredValidator, SingleSelectWhereRequiredValidator } from '../../core/validators/autocomplete-single-select-required.validator';
import { CustomDateAdapter } from 'src/app/core/custom-date-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
export const MY_FORMATS = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'dddd[,] Do MMM YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};
@Component({
  selector: 'app-tasks-grid',
  templateUrl: './tasks-grid.component.html',
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
    /*{ provide: MAT_DATE_FORMATS, useValue: MAT_MOMENT_DATE_FORMATS },*/
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
  ],
})
export class TasksGridComponent implements OnInit {
  @Input() statuses: { key: string,value: string}[] = [];
  @Input() allWheres: TaskWhereData[] = [];
  @Input() allActions: TaskActionData[] = [];
  @Input() selectedTaskId: string = null;
  @Input() onlyMyTasks: boolean = false;
  @Input() taskConfigurationId: string = null;
  @Input() userGroupId: string = null;
  @Input() userSubGroupId: string = null;

  @Output() taskSelected: EventEmitter<string> = new EventEmitter<string>();

  tasks$: BehaviorSubject<TaskGridItem[]> = new BehaviorSubject<TaskGridItem[]>([]);
  totalNumber$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  loadedNumber$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  showLoadMore$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  filterForm: FormGroup;

  filteredTaskActions$: Observable<TaskActionData[]>;

  constructor(private _formBuilder: FormBuilder, private _toastr: ToastrService, private _taskManagementClient: TasksManagementClient, private loading: LoadingService) {
  }

  ngOnInit(): void {
    this.filterForm = this._formBuilder.group({
      action: [""],
      wheres: [[]],
      statusKey: ["ANY"],
      from: [],
      to: [],
    });

    this.filterForm.controls.action.valueChanges.subscribe(() => {
      this.showTasks(0, 20);
    });
    this.filterForm.controls.wheres.valueChanges.subscribe(() => {
      this.showTasks(0, 20);
    });

    this.filteredTaskActions$ = this.filterForm.controls.action.valueChanges
      .pipe(
        startWith(''),
        map(value => {
          if (typeof (value) === "string") {
            return this._filterTaskActions(value);
          }
          else {
            this._selectTaskAction(value);
            return this.allActions;
          }
        })
      );

      this.showTasks(0, 20);
  }

  public loadMore() {
    this.showTasks(this.loadedNumber$.value, 20);
  }
  private _selectTaskAction(action: TaskActionData): void {
  }

  public displayTaskAction(action: TaskActionData): string {
    if (action) {
      return action.actionName + " " + action.assetName;
    }

    return '';
  }

  private _filterTaskActions(value: string): TaskActionData[] {
    let valueParam: string = value.toLowerCase();
    return this.allActions.filter(a => a.actionName.toLowerCase().indexOf(valueParam) > -1 || a.assetName.toLowerCase().indexOf(valueParam) > -1);
  }
  private showTasks(skip: number, take: number) {
    this.loading.start();

    let query: GetPageOfTasksForGridQuery = new GetPageOfTasksForGridQuery({
      skip: skip,
      take: take,
      sortKey: "CREATED_AT_DESC",
      taskConfigurationId: this.taskConfigurationId,
      onlyMyTasks: this.onlyMyTasks,
      userGroupId: this.userGroupId,
      userSubGroupId: this.userSubGroupId,
      loadMissedUnfinishedTasks: null,
      loadOnlyCurrentTasks: false,
      currentDateString: null,
    });

    //if (typeof filterFormValues.action === "object") {
    //  query.assetId = filterFormValues.action.assetId;
    //  query.actionName = filterFormValues.action.actionName;
    //  //query.assetModelId = filterFormValues.action.assetModelId;
    //}

    this._taskManagementClient.getPageOfTasksForGrid(query).subscribe(
      (response: PageOfOfTaskGridItem) => {
        if (skip === 0) {
          this.tasks$.next(response.items);
        }
        else {
          this.tasks$.next([...this.tasks$.value, ...response.items]);
        }
        this.totalNumber$.next(response.totalNumberOfItems);
        this.loadedNumber$.next(this.tasks$.value.length);
        this.showLoadMore$.next(this.loadedNumber$.value < this.totalNumber$.value);
      },
      (error: Error) => { this._toastr.error(error.message); this.loading.stop(); },
      () => { this.loading.stop(); }
    );
  }

  public selectTask(taskId: string) {
    this.taskSelected.next(taskId);
  }

}
