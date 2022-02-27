import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { ProcessResponse, RoomManagementClient, RoomMessageListItem, RoomViewDashboardBedItem, RoomViewDashboardRoomItem, UpdateIsCleaningPriorityCommand, UpdateIsGuestCurrentlyInCommand } from 'src/app/core/autogenerated-clients/api-client';

@Component({
  selector: 'app-room-message-list-item',
  templateUrl: './room-message-list-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoomMessageListItemComponent implements OnInit {

  @Input() room: RoomViewDashboardRoomItem | RoomViewDashboardBedItem;
  @Input() message: RoomMessageListItem;

  @Output() edited: EventEmitter<string> = new EventEmitter<string>();

  constructor(
  ) {
  }

  ngOnInit() {
  }

  edit() {
    this.edited.next(this.message.id);
  }
}
