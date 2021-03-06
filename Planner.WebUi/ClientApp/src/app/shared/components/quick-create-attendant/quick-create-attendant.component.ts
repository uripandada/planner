import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FullGroupHierarchyData, GetFullUserGroupsHierarchyQuery, GroupHierarchyData, InsertUserCommand, ProcessResponse, ProcessResponseOfIEnumerableOfRoleListModel, ProcessResponseOfUserHierarchyData, RoleClient, RoleListModel, SaveAvatarData, SubGroupHierarchyData, UserHierarchyData, UserManagementClient, UserModel } from 'src/app/core/autogenerated-clients/api-client';
import { ColorService } from 'src/app/core/services/color.service';
import { HotelService } from 'src/app/core/services/hotel.service';
import { LoadingService } from 'src/app/core/services/loading.service';
import { languages } from '../../constants/languages';
import { MustMatch } from '../../helpers/must-match-validator';
import { AvatarUploadData } from '../avatar-upload/avatar-upload-data';
import { QuickCreateAttendantResult } from './quick-create-attendant-result';

@Component({
  selector: 'app-quick-create-attendant',
  templateUrl: './quick-create-attendant.component.html',
  styleUrls: ['./quick-create-attendant.component.scss']
})
export class QuickCreateAttendantComponent implements OnInit {

  @Output() closed: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() created: EventEmitter<QuickCreateAttendantResult> = new EventEmitter<QuickCreateAttendantResult>();

  isSaving$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isAvatarSet$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  hasAvatarChanged$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  avatar$: BehaviorSubject<AvatarUploadData> = new BehaviorSubject<AvatarUploadData>(null);
  roles: RoleListModel[];
  groups: GroupHierarchyData[];
  subGroups: SubGroupHierarchyData[];
  hierarchy$: Observable<FullGroupHierarchyData>;
  languages = languages;
  userForm: FormGroup;
  userDetails: Partial<UserModel>

  constructor(
    private readonly _formBuilder: FormBuilder,
    private readonly _colorService: ColorService,
    private readonly _toastr: ToastrService,
    private readonly _hotelService: HotelService,
    public loading: LoadingService,
    private _userManagementClient: UserManagementClient,
    private _route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.roles = this._route.snapshot.data.roles.data;
    this.userDetails = this._generateNewUserModel();
    this.hierarchy$ = this._userManagementClient.getFullUserGroupsHierarchy(new GetFullUserGroupsHierarchyQuery({
      activeStatusKey: "ANY",
      keywords: null,
      sortKey: "NAME_ASC",
      showEmptyGroupsAndSubGroups: true
    })).pipe(
      tap((response: FullGroupHierarchyData) => {
        this.groups = response.groups;
      })
    )
    this._buildForm()
    this.userForm.controls['groupId'].valueChanges.subscribe((groupId: string) => {
      if (groupId) {
        this.subGroups = this.groups.find(x => x.id === groupId).subGroups;
      } else {
        this.subGroups = [];
      }
    })
  }

  private _buildForm() {
    this.userForm = this._formBuilder.group({
      firstName: [null, Validators.required],
      language: [this.languages[0].key],
      lastName: [null, Validators.required],
      password: [null, Validators.required],
      passwordConfirmation: [null, Validators.required],
      registrationNumber: [null],
      userName: [null, Validators.required],
      groupId: [null],
      subGroupId: [null],
      isSubGroupLeader: [false],
      roleId: this.roles.find(r => r.name === "Attendant").id,
    }, {
      validator: MustMatch('password', 'passwordConfirmation')
    });
  }

  private _generateNewUserModel(): Partial<UserModel> {
    return new UserModel({
      id: null,
      firstName: null,
      language: null,
      lastName: null,
      registrationNumber: null,
      userName: null,
      userSubGroupId: null,
      userGroupId: null,
      isSubGroupLeader: false,
      isActive: true,
      avatarImageUrl: null,
      roleId: this.roles.find(r => r.name === "Attendant").id,
      defaultAvatarColorHex: this._colorService.GenerateRandomPastelColorHex(),
    });
  }

  onAvatarImageSelected(avatarData: AvatarUploadData) {
    this.avatar$.next(avatarData);
    this.isAvatarSet$.next(true);
    this.hasAvatarChanged$.next(true);
  }

  onAvatarImageRemoved() {

  }

  handleCreateNewAttendant() {
    if (!this.userForm.valid) {
      this._toastr.error('Can\'t save user while there are form errors.');
      this.userForm.markAllAsTouched();
      this.userForm.markAsDirty({ onlySelf: false });
      return;
    }

    this.isSaving$.next(true);
    this.loading.start();

    const userFormValues = this.userForm.getRawValue();

    const insertUserRequest = new InsertUserCommand({
      userName: userFormValues.userName,
      password: userFormValues.password,
      passwordConfirmation: userFormValues.passwordConfirmation,
      firstName: userFormValues.firstName,
      lastName: userFormValues.lastName,
      registrationNumber: userFormValues.registrationNumber,
      language: userFormValues.language,
      userSubGroupId: userFormValues.subGroupId,
      userGroupId: userFormValues.groupId,
      roleId: userFormValues.roleId,
      isSubGroupLeader: userFormValues.isSubGroupLeader,
      isActive: true,
      defaultAvatarColorHex: this._colorService.GenerateRandomPastelColorHex(),
      hotelIds: [this._hotelService.getSelectedHotelId()]
    });

    if (this.isAvatarSet$.value) {
      insertUserRequest.avatarData = new SaveAvatarData({
        file: this.avatar$.value.file,
        fileName: this.avatar$.value.fileName,
        hasChanged: this.hasAvatarChanged$.value
      });
    }

    this._userManagementClient.insertUser(insertUserRequest).subscribe((response: ProcessResponseOfUserHierarchyData) => {
      if (response.hasError) {
        this._toastr.error(response.message);
        this._setFormValidationErrors(response, this.userForm);
        this.isSaving$.next(false);
        return;
      }
      this._toastr.success(response.message);
      this.isSaving$.next(false);

      let result = new QuickCreateAttendantResult();
      result.user = response.data;
      result.groupName = !!insertUserRequest.userGroupId ? this.groups.find(g => g.id === insertUserRequest.userGroupId).name : "";
      result.subGroupName = !!insertUserRequest.userGroupId ? this.subGroups.find(g => g.id === insertUserRequest.userSubGroupId).name : "";
      this.created.next(result);
    },
      (error) => {
        this._toastr.error(error);
        this.isSaving$.next(false);
        return;
      },
      () => {
        this.loading.stop();
        this.isSaving$.next(false);
      });
  }

  closePopup() {
    this.closed.emit();
  }

  private _setFormValidationErrors(response: ProcessResponse, form: FormGroup) {
    for (let error of response.modelErrors) {
      let control = form.get(error.key);

      if (control) {
        var errors: ValidationErrors = {};
        errors[error.validatorKey] = true;

        control.setErrors(errors)
        control.markAsDirty();
        control.markAsTouched();
      }
    }
  }

}
