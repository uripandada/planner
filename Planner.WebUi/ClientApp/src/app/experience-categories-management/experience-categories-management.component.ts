import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LoadingService } from '../core/services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { HotelService } from '../core/services/hotel.service';
import { BehaviorSubject } from 'rxjs';
import { GetPageOfExperienceCategoriesQuery, GetExperienceCategoryDetailsQuery, InsertExperienceCategoryCommand, PageOfOfExperienceCategoryGridItemViewModel, ProcessResponse, ProcessResponseOfGuid, ExperienceCategoryDetailsViewModel, ExperienceCategoryGridItemViewModel, ExperienceCategoryManagementClient, UpdateExperienceCategoryCommand } from '../core/autogenerated-clients/api-client';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-experience-categories-management',
  templateUrl: './experience-categories-management.component.html',
  styleUrls: ['./experience-categories-management.component.scss']
})
export class ExperienceCategoriesComponent implements OnInit {
  sorts = [
    { key: 'CATEGORY_ASC', value: 'Category A to Z'  },
    { key: 'CATEGORY_DESC', value: 'Category Z to A' },
    { key: 'EXPERIENCE_NAME_ASC', value: 'Experience Name A to Z' },
    { key: 'EXPERIENCE_NAME_DESC', value: 'Experience Name Z to A' },
  ];

  isCategoryLoaded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isLoadingCategoryDetails$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  showLoadMore$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  loadedNumberOfCategories$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  totalNumberOfCategories$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  selectedCategoryId$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  Categories$: BehaviorSubject<ExperienceCategoryGridItemViewModel[]> = new BehaviorSubject<ExperienceCategoryGridItemViewModel[]>([]);


  areDetailsDisplayed$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  selectedCategoryDetails$: BehaviorSubject<ExperienceCategoryDetailsViewModel> = new BehaviorSubject<ExperienceCategoryDetailsViewModel>(new ExperienceCategoryDetailsViewModel({
    id: null,
    name: null,
    experienceName: null
  }));

  filterForm: FormGroup;

  constructor(
    public loading: LoadingService,
    private _formBuilder: FormBuilder,
    private _CategoryManagementClient: ExperienceCategoryManagementClient,
    private _route: ActivatedRoute,
    private _toastr: ToastrService) {
  }

  ngOnInit(): void {
    this.loading.start();

    this.filterForm = this._formBuilder.group({
      sortKey: ['CATEGORY_ASC'],
      keywords: [''],
    });

    this.filterForm.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(
      (formValues: any) => { this._loadCategories(0); },
      (error: Error) => { },
      () => { }
    );

    this._loadCategories(0);
  }

  selectCategory(category: ExperienceCategoryGridItemViewModel) {
    this.isLoadingCategoryDetails$.next(true);
    this.selectedCategoryId$.next(category.id);
    this.loading.start();
    let request = new GetExperienceCategoryDetailsQuery({ id: category.id });

    this._CategoryManagementClient.getExperienceCategoryDetails(request).subscribe(
      (categoryDetails: ExperienceCategoryDetailsViewModel) => {
        this.selectedCategoryDetails$.next(categoryDetails);
        this.isCategoryLoaded$.next(true);
        this.areDetailsDisplayed$.next(true);
      },
      (error: Error) => {
        this._toastr.error(error.message);
      },
      () => {
        this.isLoadingCategoryDetails$.next(false);
        this.loading.stop();
      }
    );
  }

  loadMoreCategories() {
    this._loadCategories(this.loadedNumberOfCategories$.value);
  }

  newCategoryDetails() {
    this.selectedCategoryId$.next(null);
    this.selectedCategoryDetails$.next(this._createNewCategoryDetails());
    this.isCategoryLoaded$.next(true);

    this.areDetailsDisplayed$.next(true);
  }

  onCategoryInserted(category: ExperienceCategoryDetailsViewModel) {
    this.selectedCategoryDetails$.next(category);
    this.selectedCategoryId$.next(category.id);
    this.Categories$.next([...this.Categories$.value, new ExperienceCategoryGridItemViewModel(category)]);
    this.loadedNumberOfCategories$.next(this.loadedNumberOfCategories$.value + 1);
    this.totalNumberOfCategories$.next(this.totalNumberOfCategories$.value + 1);
  }

  onCategoryUpdated(category: ExperienceCategoryDetailsViewModel) {
    this.selectedCategoryDetails$.next(category);

    let Categories = [...this.Categories$.value];
    let categoryItem = Categories.find(c => c.id === category.id);
    if (categoryItem) {
      categoryItem.name = category.name;
      categoryItem.experienceName = category.experienceName;
      this.Categories$.next(Categories);
    }
  }

  onCategoryCancel() {
    this.areDetailsDisplayed$.next(false);
    this.selectedCategoryId$.next(null);
  }

  private _createNewCategoryDetails(): ExperienceCategoryDetailsViewModel {
    return new ExperienceCategoryDetailsViewModel({
      id: null,
      name: null,
      experienceName: null
    });
  }

  private _loadCategories(skip: number) {
    this.loading.start();

    let query: GetPageOfExperienceCategoriesQuery = new GetPageOfExperienceCategoriesQuery({
      skip: skip,
      take: 20,
      keywords: this.filterForm.controls.keywords.value,
      sortKey: this.filterForm.controls.sortKey.value
    });

    this._CategoryManagementClient.getPageOfExperienceCategories(query).subscribe(
      (response: PageOfOfExperienceCategoryGridItemViewModel) => {
        if (skip === 0) {
          this.Categories$.next(response.items);
        } else {
          this.Categories$.next([...this.Categories$.value, ...response.items]);
        }
        this.totalNumberOfCategories$.next(response.totalNumberOfItems);
        this.loadedNumberOfCategories$.next(this.Categories$.value.length);
        this.showLoadMore$.next(this.loadedNumberOfCategories$.value < this.totalNumberOfCategories$.value);
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
