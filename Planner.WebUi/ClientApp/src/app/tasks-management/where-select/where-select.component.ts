import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { TaskWhereData } from '../../core/autogenerated-clients/api-client';

@Component({
  selector: 'app-where-select',
  templateUrl: './where-select.component.html',
})
export class WhereSelectComponent implements OnInit, OnChanges {
  @ViewChild('selectInput', { static: true }) multiselectInput: ElementRef;
  @Input() allWheres: Array<TaskWhereData> = [];
  @Input() whereFormControl: FormControl = null;
  @Input() placeholderText: string = "Where...";
  @Input() displayProperty: string = "referenceName";
  @Output() getSelection = new EventEmitter();
  //selectedWhereControl: FormControl;
  filteredWheres$: Observable<TaskWhereData[]>;
  displayProperty$: string

  constructor() { }

  ngOnInit(): void {
    //this.selectedWhereControl = new FormControl("");
    this.displayProperty$ = this.placeholderText;

    this.filteredWheres$ = this.whereFormControl.valueChanges
      .pipe(
        startWith(''),
        map(value => {
          if (typeof (value) === "string") {
            return this._filterWheres(value);
          }
          else {
            return this.allWheres;
          }
        })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  getPosts(value: TaskWhereData) : void {
    this.getSelection.emit(value);
  }

  displayWhere(where: any): string {
    if(!where) {
      return '';
    }
    if (typeof (where) === "string") {
      return where;
    }
    else if (this.displayProperty$ == "typeDescription") {
      return where.typeDescription;
    }
    else {
      return where.referenceName;
    }
  }

  private _filterWheres(value: string): TaskWhereData[] {
    let valueParam: string = value.toLowerCase();
    return this.allWheres.filter(a => a.referenceName.toLowerCase().indexOf(valueParam) > -1 || a.typeDescription.toLowerCase().indexOf(valueParam) > -1 );
  }
}