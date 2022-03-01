import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { AssetManagementClient } from '../../core/autogenerated-clients/api-client';
import { BehaviorSubject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-asset-model',
  templateUrl: './asset-model.component.html',
  styleUrls: ['./asset-model.component.scss']
})
export class AssetModelComponent implements OnInit, OnChanges {

  @Input() assetModelForm: FormGroup;
  @Input() modelIndex: number = -1;
  @Input() numberOfAssignments: number = 0;
  @Input() isSelected: boolean;

  @Output() cancelled: EventEmitter<number> = new EventEmitter<number>();
  @Output() inserted: EventEmitter<number> = new EventEmitter<number>();
  @Output() updated: EventEmitter<number> = new EventEmitter<number>();
  @Output() selected: EventEmitter<number> = new EventEmitter<number>();

  public isCreateNew$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  public isEditMode$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  public isSelected$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private _roomManagementClient: AssetManagementClient, private _router: Router, private _formBuilder: FormBuilder, private _route: ActivatedRoute, private _toastr: ToastrService, public loading: LoadingService) { }
  ngOnInit(): void {
    this.isCreateNew$.next(this.assetModelForm.controls.id.value === null);
    this.isEditMode$.next(this.isCreateNew$.value);
    this.isSelected$.next(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.assetModelForm) {
      if (this.assetModelForm.controls.id.value) {
        this.isCreateNew$.next(false);
        this.isEditMode$.next(false);
      }
    }
    if (changes.isSelected) {
      this.isSelected$.next(changes.isSelected.currentValue);
    }
  }

  public select() {
    this.selected.next(this.modelIndex);
  }

  public edit() {
    this.isEditMode$.next(true);
  }

  public delete() {

  }

  public save() {
    if (!this.assetModelForm.valid) {
      this._toastr.error("Can't save the asset model while there are form errors.");
      return;
    }

    if (this.isCreateNew$.value) {
      this.inserted.next(this.modelIndex);
    }
    else {
      this.updated.next(this.modelIndex);
    }
      this.isEditMode$.next(false);
      this.isCreateNew$.next(false);
  }

  public cancel() {
    if (this.assetModelForm.controls.id) {
      this.isEditMode$.next(false);
    }
    this.cancelled.next(this.modelIndex);
  }
}