import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Subscription } from 'rxjs';
import { GetTaskMessagesQuery, PageOfOfTaskMessageViewModel, ProcessResponseOfTaskMessageViewModel, SendTaskMessageCommand, TaskMessagesViewModel, TaskMessageViewModel, TasksManagementClient } from '../../core/autogenerated-clients/api-client';
import { LoadingService } from '../../core/services/loading.service';
import { TaskMessageGroup } from './task-message-group';

@Component({
  selector: 'app-task-chat',
  templateUrl: './task-chat.component.html',
  styleUrls: ['./task-chat.component.scss']
})
export class TaskChatComponent implements OnInit, OnDestroy {

  @Input() taskId: string;

  totalNumberOfMessages$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  messages$: BehaviorSubject<TaskMessageViewModel[]> = new BehaviorSubject<TaskMessageViewModel[]>([]);
  messageGroups$: BehaviorSubject<TaskMessageGroup[]> = new BehaviorSubject<TaskMessageGroup[]>([]);
  isLoadingMessages$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  myInitials$: BehaviorSubject<string> = new BehaviorSubject<string>("");
  myFullName$: BehaviorSubject<string> = new BehaviorSubject<string>("");

  private _getTaskMessagesSubscription: Subscription;
  private _sendMessageSubscription: Subscription;

  sendMessageForm: FormGroup;

  constructor(private _tasksManagementClient: TasksManagementClient, public loading: LoadingService, private _toastr: ToastrService, private _formBuilder: FormBuilder) {
  }

  ngOnInit(): void {
    this.isLoadingMessages$.next(true);
    let query: GetTaskMessagesQuery = new GetTaskMessagesQuery({ taskId: this.taskId });

    this.sendMessageForm = this._formBuilder.group({
      message: ['', Validators.required]
    });

    this._getTaskMessagesSubscription = this._tasksManagementClient
      .getTaskMessages(query)
      .subscribe(
        (response: TaskMessagesViewModel) => {
          this.totalNumberOfMessages$.next(response.pageOfMessages.totalNumberOfItems);
          this.messages$.next(response.pageOfMessages.items);
          this.messageGroups$.next(this._createMessageGroups(response.pageOfMessages.items));
          this.myInitials$.next(response.createdByInitials);
          this.myFullName$.next(response.createdByUserFullName);
        },
        (error: Error) => {
          this._toastr.error(error.message);
        },
        () => {
          this.loading.stop();
          this.isLoadingMessages$.next(false);
        }
      );
  }

  ngOnDestroy(): void {
    this._getTaskMessagesSubscription.unsubscribe();
    if (this._sendMessageSubscription) {
      this._sendMessageSubscription.unsubscribe();
    }
  }

  sendMessage(): void {
    if (!this.sendMessageForm.valid) {
      this.sendMessageForm.markAllAsTouched();
      this.sendMessageForm.markAsDirty({ onlySelf: false });
      return;
    }

    this.loading.start();

    this._sendMessageSubscription = this._tasksManagementClient.sendTaskMessage(new SendTaskMessageCommand({ taskId: this.taskId, message: this.sendMessageForm.controls.message.value })).subscribe(
      (response: ProcessResponseOfTaskMessageViewModel) => {
        if (response.hasError) {
          this._toastr.error(response.message);
          return;
        }

        let messages = [...this.messages$.value];
        messages.push(response.data);
        this.messages$.next(messages);

        let messageGroups = this._addNewMessageToMessageGroups([...this.messageGroups$.value], response.data);
        this.messageGroups$.next(messageGroups);

        this.sendMessageForm.controls.message.setValue('');
        this.sendMessageForm.markAsUntouched({ onlySelf: false });
        this.sendMessageForm.markAsPristine({ onlySelf: false });
      },
      (error: Error) => {
        this._toastr.error(error.message);
      },
      () => {
        this.loading.stop();
      }
    );
  }

  private _createMessageGroups(messages: TaskMessageViewModel[]): TaskMessageGroup[] {
    if (messages.length === 0) {
      return [];
    }

    let messageGroups: TaskMessageGroup[] = [this._createMessageGroup(messages[0])];

    for (let message of this.messages$.value) {
      let messageGroup: TaskMessageGroup = messageGroups[messageGroups.length - 1];

      if (messageGroup.createdByUserId !== message.createdByUserId) {
        messageGroup = this._createMessageGroup(message);
        messageGroups.push(messageGroup);
      }

      if (messageGroup.messages.length > 0) {
        let lastMessage = messageGroup.messages[messageGroup.messages.length - 1];
        let diffMs = (new Date(message.createdAtString)).getTime() - (new Date(lastMessage.createdAtString)).getTime();
        let diffMins = (diffMs / (60000));
        if (diffMins > 10) {
          messageGroup = this._createMessageGroup(message);
          messageGroups.push(messageGroup);
        }
      }

      messageGroup.messages.push(message);
    }

    return messageGroups;
  }

  private _addNewMessageToMessageGroups(messageGroups: TaskMessageGroup[], message: TaskMessageViewModel): TaskMessageGroup[] {
    if (messageGroups.length === 0) {
      let messageGroup = this._createMessageGroup(message);
      messageGroup.messages.push(message);

      messageGroups.push(messageGroup);
      return [...messageGroups];
    }
    else {
      let messageGroup = messageGroups[messageGroups.length - 1];

      if (messageGroup.createdByUserId !== message.createdByUserId) {
        messageGroup = this._createMessageGroup(message);
        messageGroups.push(messageGroup);
      }

      if (messageGroup.messages.length > 0) {
        let lastMessage = messageGroup.messages[messageGroup.messages.length - 1];
        let diffMs = (new Date(message.createdAtString)).getTime() - (new Date(lastMessage.createdAtString)).getTime();
        let diffMins = (diffMs / (60000));
        if (diffMins > 10) {
          messageGroup = this._createMessageGroup(message);
          messageGroups.push(messageGroup);
        }
      }

      messageGroup.messages.push(message);
      return [...messageGroups];
    }
  }


  private _createMessageGroup(message: TaskMessageViewModel): TaskMessageGroup {
    return {
      avatarUrl: message.avatarUrl,
      createdAtString: message.createdAtString,
      createdByInitials: message.createdByInitials,
      createdByUserFullName: message.createdByUserFullName,
      hasAvatar: message.hasAvatar,
      isMyMessage: message.isMyMessage,
      createdByUserId: message.createdByUserId,
      messages: []
    };
  }
}
