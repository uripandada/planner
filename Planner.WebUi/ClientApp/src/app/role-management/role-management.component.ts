import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { relativeTimeRounding } from 'moment';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { RoleClient, RoleListModel, RoleModel } from '../core/autogenerated-clients/api-client';
import { LoadingService } from '../core/services/loading.service';

@Component({
  selector: 'app-role-management',
  templateUrl: './role-management.component.html',
  styleUrls: ['./role-management.component.scss']
})
export class RoleManagementComponent implements OnInit {

  filterForm: FormGroup;
  roles: RoleListModel[];
  rolesList: BehaviorSubject<RoleListModel[]> = new BehaviorSubject<RoleListModel[]>(null);
  selectedRole: BehaviorSubject<RoleModel> = new BehaviorSubject<RoleModel>(null);

  areDetailsDisplayed$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    public loading: LoadingService,
    private roleClient: RoleClient,
    private toastr: ToastrService,
  ) {
    this.roles = this.route.snapshot.data.roles.data;
    this.rolesList.next(this.roles);
  }

  ngOnInit() {
    this.filterForm = this.formBuilder.group({
      keywords: ['']
    });

    this.filterForm.controls.keywords.valueChanges.subscribe((keywords: string) => {
      if (keywords.length > 0) {
        this.rolesList.next(this.roles.filter(x => x.name.toLowerCase().includes(keywords.toLowerCase())));
      } else {
        this.rolesList.next(this.roles);
      }
    });
  }

  createNew() {
    const newRole = new RoleModel({
      id: '',
      isSystemRole: false,
      name: '',
      hotelAccessTypeKey: "MULTIPLE",
      assetsClaim: true,
      cleaningPlannerClaim: true,
      hotelSettingClaim: true,
      roleManagementClaim: true,
      roomCategoriesClaim: true,
      roomsClaim: true,
      tasksClaim: true,
      usersClaim: true,
      reservationClaim: true,
      cleaningCalendarClaim: true,
      lostAndFoundClaim: true,
      onGuardClaim: true,
      reservationCalendarClaim: true,
      roomInsightsClaim: true,
      userInsightsClaim: true,
      hotelAccessTypeDescription: "User can access specified hotels.",
    });
    this.selectedRole.next(newRole);
    this.areDetailsDisplayed$.next(true);
  }

  reloadList(reload: boolean) {
    if (reload) {
      this.loading.start();
      this.roleClient.getRolesList().subscribe((response) => {
        if (response.isSuccess) {

          this.roles = response.data;
          this.rolesList.next(this.roles);
          this.selectRole(this.roles[0]);
        } else {
          this.toastr.error(response.message);
        }
        this.loading.stop();
      },
        (error) => {
          this.toastr.error(error);
          this.loading.stop();
        });
    }
  }

  selectRole(role: RoleListModel) {
    this.roleClient.getRoleById(role.id).subscribe(
      (response) => {
        if (response.isSuccess) {
          this.selectedRole.next(response.data);
          this.areDetailsDisplayed$.next(true);
        } else {
          this.toastr.error('Error loading role.');
        }
      },
      (error) => {
        this.toastr.error(error);
      }
    );
  }

  onRoleEditCancelled() {
    this.areDetailsDisplayed$.next(false);
    this.selectedRole.next(null);
  }

  onRoleInserted(roleDetails: RoleModel) {
    let role: RoleListModel = new RoleListModel(roleDetails);
    this.rolesList.next([...this.rolesList.value, role]);

    this.selectedRole.next(roleDetails);
    this.areDetailsDisplayed$.next(true);
  }

  onRoleUpdated(roleDetails: RoleModel) {
    let roleList = this.rolesList.value;
    let selectedRoleIndex = roleList.findIndex(r => r.id === roleDetails.id);
    let role: RoleListModel = new RoleListModel(roleDetails);

    roleList.splice(selectedRoleIndex, 1, role);

    this.rolesList.next(roleList);
  }

  onRoleDeleted(roleDetails: RoleModel) {
    let roleList = this.rolesList.value;
    let selectedRoleIndex = roleList.findIndex(r => r.id === roleDetails.id);

    roleList.splice(selectedRoleIndex, 1);

    this.rolesList.next(roleList);
    this.areDetailsDisplayed$.next(false);
    this.selectedRole.next(null);
  }
}
