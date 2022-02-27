import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ChangeMyOnDutyStatusCommand, DeleteGroupCommand, DeleteProcessResponse, DeleteUserCommand, ExportUsersClient, FileResponse, FullGroupHierarchyData, GetFullUserGroupsHierarchyQuery, GroupHierarchyData, ProcessResponse, ProcessResponseOfFullGroupHierarchyData, SubGroupHierarchyData, UserHierarchyData, UserManagementClient } from '../core/autogenerated-clients/api-client';
import { LoadingService } from '../core/services/loading.service';
import { HttpClient } from '@angular/common/http';
import { FileSaverService } from 'ngx-filesaver';

@Component({
  selector: 'app-users-management',
  templateUrl: './users-management.component.html',
  styleUrls: ['./users-management.component.scss']
})
export class UsersManagementComponent implements OnInit {

  sorts = [
    { key: 'NAME_ASC', value: 'Name A to Z' },
    { key: 'NAME_DESC', value: 'Name Z to A' },
  ];
  statuses = [
    { key: 'ANY', value: 'Active and inactive' },
    { key: 'ACTIVE', value: 'Only active' },
    { key: 'INACTIVE', value: 'Only inactive' },
  ];

  filterForm: FormGroup;

  hierarchy: FullGroupHierarchyData;

  hierarchyForm: FormGroup;

  numberOfUserGroups$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  numberOfUserSubGroups$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  numberOfUsers$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  numberOfUngroupedUsers$: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  areUngroupedUsersCollapsed$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private _formBuilder: FormBuilder,
    private _route: ActivatedRoute,
    public loading: LoadingService,
    private userManagementClient: UserManagementClient,
    private toastr: ToastrService,
    private _router: Router,
    private httpClient: HttpClient,
    private exportUsersClient: ExportUsersClient,
    private _fileSaver: FileSaverService,
  ) { }

  get groupsFormArray(): FormArray {
    return this.hierarchyForm.controls.groups as FormArray;
  }

  get ungroupedUsersFormArray(): FormArray {
    return this.hierarchyForm.controls.ungroupedUsers as FormArray;
  }

  ngOnInit() {
    this.hierarchy = this._route.snapshot.data.hierarchy;

    this.filterForm = this._formBuilder.group({
      sortKey: ['NAME_ASC'],
      keywords: [''],
      statusKey: ['ANY'],
      showEmptyGroupsAndSubGroups: [true]
    });

    this.generateHierarchyForm(this.hierarchy);

    this.filterForm.valueChanges
      .pipe(
        debounceTime(250)
      )
      .subscribe(formValue => {

      let filterRequest: GetFullUserGroupsHierarchyQuery = new GetFullUserGroupsHierarchyQuery({
        keywords: formValue.keywords,
        sortKey: formValue.sortKey,
        activeStatusKey: formValue.statusKey,
        showEmptyGroupsAndSubGroups: formValue.showEmptyGroupsAndSubGroups
      });

      this.userManagementClient.getFullUserGroupsHierarchy(filterRequest)
        .subscribe((hierarchyData: FullGroupHierarchyData) => {
            this.hierarchy = hierarchyData;
            this.generateHierarchyForm(this.hierarchy);
            this._setUserNumbersFromTheHierarchy();
        });
    });

    this._setUserNumbersFromTheHierarchy();
  }

  onGroupAdded() {
    this.numberOfUserGroups$.next(this.numberOfUserGroups$.value + 1);
  }

  onSubGroupAdded() {
    this.numberOfUserSubGroups$.next(this.numberOfUserSubGroups$.value + 1);
  }

  onSubGroupRemoved() {
    this.numberOfUserSubGroups$.next(this.numberOfUserSubGroups$.value - 1);
  }

  toggleUngroupedUsersCollapse() {
    this.areUngroupedUsersCollapsed$.next(!this.areUngroupedUsersCollapsed$.value);
  }

  editUser(userId: number, userIndex: number) {
    this._router.navigate(['users-management', 'user-details'],
      {
        queryParams:
        {
          userId: userId,
          userIndex: userIndex
        }
      });
  }

  private _isOnDuty: boolean = false;
  toggleOnDutyStatus() {
    this.userManagementClient.changeMyOnDutyStatus(new ChangeMyOnDutyStatusCommand({ isOnDuty: !this._isOnDuty, hotelId: "5ee20acb6b0d14000faf4706" })).subscribe((response: ProcessResponse) => {
      this.toastr.success("ON DUTY CHANGED!");
      this._isOnDuty = !this._isOnDuty;
    });
  }

  private _setUserNumbersFromTheHierarchy() {
    let numberOfSubGroups = 0;
    let numberOfUsers = 0;
    for (let group of this.hierarchy.groups) {
      numberOfSubGroups += group.subGroups.length;

      for (let subGroup of group.subGroups) {
        numberOfUsers += subGroup.users.length;
      }
    }

    this.numberOfUserGroups$.next(this.hierarchy.groups.length);
    this.numberOfUserSubGroups$.next(numberOfSubGroups);
    this.numberOfUsers$.next(numberOfUsers);
  }

  private generateHierarchyForm(data: FullGroupHierarchyData): void {
    this.hierarchyForm = this._formBuilder.group({
      groups: this.generateGroupsFormArray(data.groups),
      ungroupedUsers: this.generateUserFormArray(data.ungroupedUsers),
    });
  }

  private generateGroupsFormArray(groups: Array<GroupHierarchyData>): FormArray {
    const groupsFormArray: Array<FormGroup> = [];
    if (groups) {
      for (const group of groups) {
        groupsFormArray.push(this.generateGroupFormGroup(group));
      }
    }

    return this._formBuilder.array(groupsFormArray);
  }

  private generateGroupFormGroup(group: GroupHierarchyData) {
    return this._formBuilder.group({
      id: group.id,
      name: [group.name, Validators.required],
      users: this.generateUserFormArray(group.users),
      subGroups: this.generateSubGroupsFormArray(group.subGroups, group.id)
    });
  }

  private generateSubGroupsFormArray(subGroups: Array<SubGroupHierarchyData>, groupId: string): FormArray {
    const subGroupsFormArray: Array<FormGroup> = [];

    for (const subGroup of subGroups) {
      subGroupsFormArray.push(this._formBuilder.group({
        id: subGroup.id,
        name: subGroup.name,
        groupId: groupId,
        users: this.generateUserFormArray(subGroup.users)
      }));
    }

    return this._formBuilder.array(subGroupsFormArray);
  }

  private generateUserFormArray(users: Array<UserHierarchyData>): FormArray {
    const usersFormArray: Array<FormGroup> = [];

    if (users && users.length > 0) {
      for (const user of users) {
        usersFormArray.push(this._formBuilder.group({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          userRole: user.userRole,
          initials: user.fullNameInitials,
          avatarImageUrl: user.avatarImageUrl,
          isSubGroupLeader: user.isSubGroupLeader,
          isActive: user.isActive,
          defaultAvatarColorHex: user.defaultAvatarColorHex
        }));
      }
    }

    return this._formBuilder.array(usersFormArray);
  }

  addGroup(addToTheBegginngOfArray: boolean = false) {
    const number = this.groupsFormArray.length;

    if (addToTheBegginngOfArray) {
      this.groupsFormArray.insert(0, this.generateGroupFormGroup(
        new GroupHierarchyData({
          id: null,
          name: 'Group' + number,
          subGroups: [],
          createdAt: null
        })
      ));
    }
    else {
      this.groupsFormArray.push(this.generateGroupFormGroup(
        new GroupHierarchyData({
          id: null,
          name: 'Group' + number,
          subGroups: [],
          createdAt: null
        })
      ));
    }
  }

  removeGroupForm(formIndex: number): void {
    this.groupsFormArray.removeAt(formIndex);

    this.numberOfUserGroups$.next(this.groupsFormArray.length);
  }

  deleteGroup(formIndex: number): void {
    this.loading.start();

    const groupFormData = this.groupsFormArray.at(formIndex).value;
    const groupId: string = groupFormData.id;

    this.userManagementClient.deleteGroup(new DeleteGroupCommand({ id: groupId })).subscribe(
      (response: ProcessResponse) => {
      if (response.hasError) {
        this.toastr.error(response.message);
        return;
      }
        this.groupsFormArray.removeAt(formIndex);
        this.numberOfUserGroups$.next(this.groupsFormArray.length);
      this.toastr.success(response.message);
    },
      (error) => {
        this.toastr.error(error.message);
      },
      () => {
        this.loading.stop();
      }
    );
  }

  deleteUser(userIndex: number) {
    this.loading.start();

    const userForm = this.ungroupedUsersFormArray.at(userIndex) as FormGroup;
    const userFormData = this.ungroupedUsersFormArray.at(userIndex).value;
    const userId = userFormData.id;

    this.userManagementClient.deleteUser(new DeleteUserCommand({
      id: userId
    })).subscribe(
      (response: DeleteProcessResponse) => {
        if (response.isSuccess) {
          this.ungroupedUsersFormArray.removeAt(userIndex);
          this.toastr.success(response.message);
        } else if (response.hasWarning) {
          userForm.controls.isActive.setValue(false);
          this.toastr.warning(response.message);
        } else {
          this.toastr.error(response.message);
        }
      },
      (error) => {
        this.toastr.error(error.message);
      },
      () => {
        this.loading.stop();
      }
    );
  }

  openUserImportPreview() {
    this._router.navigate(['users-management', 'user-import-preview']);
  }

  initiateUserExport() {
    this.exportUsersClient.exportUsersFromDatabase().subscribe((response: FileResponse) => {
      this._fileSaver.save(response.data, response.fileName);
    });
  }
}
