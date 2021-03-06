import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { EnumData } from '../../core/autogenerated-clients/api-client';

@Component({
  selector: 'app-task-recurring-weekly',
  templateUrl: './task-recurring-weekly.component.html',
  styleUrls: ['./task-recurring-weekly.component.scss']
})
export class TaskRecurringWeeklyComponent implements OnInit {
  @Input() taskRecurringWeeklyForm: FormGroup; // startsAtDate, weekDaysArray


  get weekDaysArray(): FormArray {
    return this.taskRecurringWeeklyForm.controls.weekDaysArray as FormArray;
  }

  constructor() {
  }

  ngOnInit(): void {
  }
}
