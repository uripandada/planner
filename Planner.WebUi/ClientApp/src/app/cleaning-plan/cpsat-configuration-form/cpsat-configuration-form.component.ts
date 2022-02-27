import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CleaningPlanClient, CpsatPlannerConfigurationData } from '../../core/autogenerated-clients/api-client';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-cpsat-configuration-form',
  templateUrl: './cpsat-configuration-form.component.html',
  styleUrls: ['./cpsat-configuration-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CpsatConfigurationFormComponent implements OnInit, OnChanges {

  @Input() cpsatConfiguration: CpsatPlannerConfigurationData;
  @Input() isTodaysCleaningPlan: boolean;

  @Output() saved: EventEmitter<CpsatPlannerConfigurationData> = new EventEmitter<CpsatPlannerConfigurationData>();
  @Output() cancelled: EventEmitter<boolean> = new EventEmitter<boolean>();

  cpsatConfigurationForm: FormGroup;
  loading: LoadingService;

  constructor(
    private _formBuilder: FormBuilder,
    private _toastr: ToastrService,
    private _cleaningPlanClient: CleaningPlanClient
  ) {
    this.loading = new LoadingService();
  }

  ngOnInit(): void {
    this.cpsatConfigurationForm = this._createCpsatConfigurationForm(this.cpsatConfiguration);
    //this._updateWeightEpsilonStayDepartureDisabledStatus(this.cpsatConfiguration.doBalanceStaysAndDepartures);
    //this._updateLevelMovementStatus(this.cpsatConfiguration.doesLevelMovementReduceCredits);
    //this._updateBuildingMovementStatus(this.cpsatConfiguration.doesBuildingMovementReduceCredits);
    this._updateUsePreplanStatus(this.cpsatConfiguration.doUsePrePlan);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.cpsatConfigurationForm && this.cpsatConfiguration) {
      this._setCpsatConfigurationFormData(this.cpsatConfigurationForm, this.cpsatConfiguration);
    }
  }

  private _createCpsatConfigurationForm(c: CpsatPlannerConfigurationData): FormGroup {
    //let c: CpsatPlannerConfigurationData = config ? config : this._createDefaultCpsatConfigurationData();

    let form: FormGroup = this._formBuilder.group({
      doUsePrePlan: [c.doUsePrePlan, [Validators.required]],
      cleaningPriorityKey: [c.cleaningPriorityKey, [Validators.required]],
      doCompleteProposedPlanOnUsePreplan: [c.doCompleteProposedPlanOnUsePreplan, [Validators.required]],
      doUsePreAffinity: [c.doUsePreAffinity, [Validators.required]],
      arePreferredLevelsExclusive: [c.arePreferredLevelsExclusive, [Validators.required]],



      //id: [c.id],
      //planningStrategyTypeKey: [c.planningStrategyTypeKey, [Validators.required]], // BALANCE_BY_ROOMS, BALANCE_BY_CREDITS_STRICT, BALANCE_BY_CREDITS_WITH_AFFINITIES, TARGET_BY_ROOMS, TARGET_BY_CREDITS
      //balanceByRoomsMinRooms: [c.balanceByRoomsMinRooms],
      //balanceByRoomsMaxRooms: [c.balanceByRoomsMaxRooms],
      //balanceByCreditsStrictMinCredits: [c.balanceByCreditsStrictMinCredits],
      //balanceByCreditsStrictMaxCredits: [c.balanceByCreditsStrictMaxCredits],
      //balanceByCreditsWithAffinitiesMinCredits: [c.balanceByCreditsWithAffinitiesMinCredits],
      //balanceByCreditsWithAffinitiesMaxCredits: [c.balanceByCreditsWithAffinitiesMaxCredits],
      //targetByRoomsValue: [c.targetByRoomsValue], // value is set if PlanningStrategyTypeKey = TARGET_BY_ROOMS
      //targetByCreditsValue: [c.targetByCreditsValue], // value is set if PlanningStrategyTypeKey = TARGET_BY_CREDITS
      //doBalanceStaysAndDepartures: [c.doBalanceStaysAndDepartures, [Validators.required]],
      //weightEpsilonStayDeparture: [c.weightEpsilonStayDeparture],
      //maxStay: [c.maxStay, [Validators.required]],
      //maxDeparture: [c.maxDeparture, [Validators.required]],
      //maxTravelTime: [c.maxTravelTime, [Validators.required]],
      //maxBuildingTravelTime: [c.maxBuildingTravelTime, [Validators.required]],
      //maxBuildingCountPerAttendant: [c.maxNumberOfBuildingsPerAttendant, [Validators.required]],
      //maxLevelChangeCountPerAttendant: [c.maxNumberOfLevelsPerAttendant, [Validators.required]],
      //roomAward: [c.roomAward, [Validators.required]],
      //levelAward: [c.levelAward, [Validators.required]],
      //buildingAward: [c.buildingAward, [Validators.required]],
      //travelTimeWeight: [c.weightTravelTime],
      //cleaningTimeWeight: [c.weightCredits],
      //solverRunTime: [c.solverRunTime],
      //doesLevelMovementReduceCredits: [c.doesLevelMovementReduceCredits, [Validators.required]],
      //levelMovementCreditsReduction: [c.levelMovementCreditsReduction, [Validators.required]],
      //applyLevelMovementCreditReductionAfterNumberOfLevels: [c.applyLevelMovementCreditReductionAfterNumberOfLevels, [Validators.required]],

      //doesBuildingMovementReduceCredits: [c.doesBuildingMovementReduceCredits, [Validators.required]],
      //buildingMovementCreditsReduction: [c.buildingMovementCreditsReduction, [Validators.required]],
      //buildingsDistanceMatrix: [c.buildingsDistanceMatrix],
      //levelsDistanceMatrix: [c.levelsDistanceMatrix],
    });

    //form.controls.doBalanceStaysAndDepartures.valueChanges.subscribe((doIt: boolean) => {
    //  this._updateWeightEpsilonStayDepartureDisabledStatus(doIt);
    //});

    //form.controls.doesLevelMovementReduceCredits.valueChanges.subscribe((doesIt: boolean) => {
    //  this._updateLevelMovementStatus(doesIt);
    //});

    //form.controls.doesBuildingMovementReduceCredits.valueChanges.subscribe((doesIt: boolean) => {
    //  this._updateBuildingMovementStatus(doesIt);
    //});

    form.controls.doUsePrePlan.valueChanges.subscribe((doIt: boolean) => {
      this._updateUsePreplanStatus(doIt);
    });

    return form;
  }

  //private _updateWeightEpsilonStayDepartureDisabledStatus(doEnable: boolean) {
  //  if (doEnable) {
  //    this.cpsatConfigurationForm.controls.weightEpsilonStayDeparture.enable();
  //  }
  //  else {
  //    this.cpsatConfigurationForm.controls.weightEpsilonStayDeparture.disable();
  //  }
  //}

  //private _updateLevelMovementStatus(doEnable: boolean) {
  //  if (doEnable) {
  //    this.cpsatConfigurationForm.controls.levelMovementCreditsReduction.enable();
  //    this.cpsatConfigurationForm.controls.applyLevelMovementCreditReductionAfterNumberOfLevels.enable();
  //  }
  //  else {
  //    this.cpsatConfigurationForm.controls.levelMovementCreditsReduction.disable();
  //    this.cpsatConfigurationForm.controls.applyLevelMovementCreditReductionAfterNumberOfLevels.disable();
  //  }
  //}

  //private _updateBuildingMovementStatus(doEnable: boolean) {
  //  if (doEnable) {
  //    this.cpsatConfigurationForm.controls.buildingMovementCreditsReduction.enable();
  //  }
  //  else {
  //    this.cpsatConfigurationForm.controls.buildingMovementCreditsReduction.disable();
  //  }
  //}

  private _updateUsePreplanStatus(doEnable: boolean) {
    if (doEnable) {
      this.cpsatConfigurationForm.controls.doCompleteProposedPlanOnUsePreplan.enable();
    }
    else {
      this.cpsatConfigurationForm.controls.doCompleteProposedPlanOnUsePreplan.disable();
      this.cpsatConfigurationForm.controls.doCompleteProposedPlanOnUsePreplan.setValue(false);
    }
  }

  private _setCpsatConfigurationFormData(form: FormGroup, config: CpsatPlannerConfigurationData): void {
    form.patchValue(config);
    form.markAsUntouched({ onlySelf: false });
    form.markAsPristine({ onlySelf: false });
  }

  hideCpsatCofigPopup() {
    this.cancelled.next(true);
  }
  generateCpsatCleaningPlan() {
    if (!this.cpsatConfigurationForm.valid) {
      this.cpsatConfigurationForm.markAllAsTouched();
      this.cpsatConfigurationForm.markAsDirty({ onlySelf: false });
      this._toastr.error("You have to fix form errors before you can continue.");
      return;
    }
    this.saved.next(new CpsatPlannerConfigurationData(this.cpsatConfigurationForm.getRawValue()));
  }
}
