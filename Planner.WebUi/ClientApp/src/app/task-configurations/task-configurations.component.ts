import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MAT_MOMENT_DATE_FORMATS } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { GetPageOfTaskConfigurationsQuery, GetPageOfTasksQuery, GetTaskConfigurationDetailsQuery, PageOfOfTaskConfigurationGridItemData, PageOfOfTaskGridItemData, TaskConfigurationDetailsData, TaskConfigurationGridItemData, TaskGridItemData, TasksManagementClient } from '../core/autogenerated-clients/api-client';
import { CustomDateAdapter } from '../core/custom-date-adapter';
import { LoadingService } from '../core/services/loading.service';


@Component({
  selector: 'app-task-configurations',
  templateUrl: './task-configurations.component.html',
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
export class TaskConfigurationsComponent implements OnInit {
  sorts = [
    { key: 'CREATED_AT_ASC', value: 'Oldest first' },
    { key: 'CREATED_AT_DESC', value: 'Newest first' },
  ];

  filterForm: FormGroup;

  taskConfigurations$: BehaviorSubject<TaskConfigurationGridItemData[]> = new BehaviorSubject<TaskConfigurationGridItemData[]>([]);
  totalNumberOfTaskConfigurations$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  loadedNumberOfTaskConfigurations$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  showLoadMore$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  tasks$: BehaviorSubject<TaskGridItemData[]> = new BehaviorSubject<TaskGridItemData[]>([]);
  totalNumberOfTasks$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  loadedNumberOfTasks$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  showLoadMoreTasks$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  selectedTaskConfigurationGridItem$: BehaviorSubject<TaskConfigurationGridItemData> = new BehaviorSubject<TaskConfigurationGridItemData>(new TaskConfigurationGridItemData());
  selectedTaskConfigurationGridItemId$: BehaviorSubject<string> = new BehaviorSubject<string>("");
  isLoadingTaskConfigurationDetails$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isLoadingTasks$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  taskConfigurationDetails$: BehaviorSubject<TaskConfigurationDetailsData> = new BehaviorSubject<TaskConfigurationDetailsData>(new TaskConfigurationDetailsData());

  areDetailsDisplayed$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  loading: LoadingService;
  constructor(private _route: ActivatedRoute, private _router: Router, private _formBuilder: FormBuilder, private _toastr: ToastrService, private _tasksManagementClient: TasksManagementClient) {
    this.loading = new LoadingService();
  }

  ngOnInit(): void {
    this.loading.reset();

    this.filterForm = this._formBuilder.group({
      keywords: [''],
      sortKey: ['CREATED_AT_DESC'],
    });

    this.filterForm.valueChanges.subscribe(() => {
      this._filter(0, 20);
    });
    this._filter(0, 20);
  }

  loadMore() {
    this._filter(this.loadedNumberOfTaskConfigurations$.value, 20);
  }

  loadMoreConfigurationTasks() {

  }

  selectTaskConfiguration(taskConfiguration: TaskConfigurationGridItemData) {
    this.loading.start();
    this.isLoadingTaskConfigurationDetails$.next(true);
    this.isLoadingTasks$.next(true);

    this.selectedTaskConfigurationGridItem$.next(taskConfiguration);
    this.selectedTaskConfigurationGridItemId$.next(taskConfiguration.id);
    this.areDetailsDisplayed$.next(true);

    let detailsRequest = new GetTaskConfigurationDetailsQuery({ id: taskConfiguration.id, loadSummary: false });
    this._tasksManagementClient.getTaskConfigurationDetails(detailsRequest).subscribe(
      (response: TaskConfigurationDetailsData) => {
        this.taskConfigurationDetails$.next(response);
        this.isLoadingTaskConfigurationDetails$.next(false);

        let tasksQuery = new GetPageOfTasksQuery({
          onlyMyTasks: false,
          taskConfigurationId: taskConfiguration.id,
          skip: 0,
          take: 100000,
          actionName: null,
          assetGroupId: null,
          assetId: null,
          fromDateString: null,
          keywords: null,
          sortKey: null,
          statusKey: null,
          toDateString: null,
          wheres: null,
          whos: null,
        });
        this._tasksManagementClient.getPage(tasksQuery).subscribe(
          (tasksResponse: PageOfOfTaskGridItemData) => {
            this.tasks$.next(tasksResponse.items);
            this.loadedNumberOfTasks$.next(tasksResponse.items.length);
            this.totalNumberOfTasks$.next(tasksResponse.totalNumberOfItems);
            this.isLoadingTasks$.next(false);
          },
          (error: Error) => {
            this.loading.stop();
            this._toastr.error(error.message);
          },
          () => {
            this.loading.reset();
          }
        )

      },
      (error: Error) => {
        this.loading.stop();
        this._toastr.error(error.message);
      },
      () => {
        this.loading.reset();
      }
    );

  }

  private _filter(skip: number, pageSize: number) {
    this.loading.start();

    let filterFormValues = this.filterForm.getRawValue();

    let query: GetPageOfTaskConfigurationsQuery = new GetPageOfTaskConfigurationsQuery({
      skip: skip,
      take: pageSize,
      keywords: filterFormValues.keywords,
      sortKey: filterFormValues.sortKey,
    });

    this._tasksManagementClient.getPageOfTaskConfigurations(query).subscribe(
      (response: PageOfOfTaskConfigurationGridItemData) => {
        if (skip === 0) {
          this.taskConfigurations$.next(response.items);
        }
        else {
          this.taskConfigurations$.next([...this.taskConfigurations$.value, ...response.items]);
        }
        this.totalNumberOfTaskConfigurations$.next(response.totalNumberOfItems);
        this.loadedNumberOfTaskConfigurations$.next(this.taskConfigurations$.value.length);
        this.showLoadMore$.next(this.loadedNumberOfTaskConfigurations$.value < this.totalNumberOfTaskConfigurations$.value);
      },
      (error: Error) => { this._toastr.error(error.message); },
      () => { this.loading.stop(); }
    );
  }

}