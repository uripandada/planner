import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EnumData } from '../../core/autogenerated-clients/api-client';

@Component({
  selector: 'app-task-recurring-monthly',
  templateUrl: './task-recurring-monthly.component.html',
  styleUrls: ['./task-recurring-monthly.component.scss']
})
export class TaskRecurringMonthlyComponent implements OnInit {
  @Input() taskRecurringMonthlyForm: FormGroup;

  get startsAtMonthDaysArray(): FormArray {
    return this.taskRecurringMonthlyForm.controls.startsAtMonthDaysArray as FormArray;
  }

  constructor(private _formBuilder: FormBuilder) {
  }

  ngOnInit(): void {
  }

  addStartsAtMonthDay() {
    this.startsAtMonthDaysArray.push(
      this._formBuilder.group({
        id: null,
        nthOfMonth: [1, Validators.required],
        startsAtTime: ["08:00", Validators.required]
      }));
  }
}