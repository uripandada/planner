﻿using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Planner.Application.Interfaces;
using Planner.Application.RoomManagement.Commands.InsertRoom;
using Planner.Common.Data;
using Planner.Common.Extensions;
using Planner.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Planner.Application.RoomManagement.Commands.UpdateRoom
{
	public class UpdateRoomResponse
	{
	}
	public class UpdateRoomCommand: IRequest<ProcessResponse<UpdateRoomResponse>>
	{
		public Guid Id { get; set; }
		public Guid BuildingId { get; set; }
		public Guid FloorId { get; set; }
		public string Name { get; set; }
		public string TypeKey { get; set; }
		public string HotelId { get; set; }

		public string FloorSectionName { get; set; }
		public string FloorSubSectionName { get; set; }
		public Guid CategoryId { get; set; }

		public IEnumerable<SaveRoomBed> Beds { get; set; }
	}
	public class UpdateRoomCommandHandler : IRequestHandler<UpdateRoomCommand, ProcessResponse<UpdateRoomResponse>>, IAmWebApplicationHandler
	{
		private readonly IDatabaseContext _databaseContext;
		private readonly Guid _userId;

		public UpdateRoomCommandHandler(IDatabaseContext databaseContext, IHttpContextAccessor contextAccessor)
		{
			this._databaseContext = databaseContext;
			this._userId = contextAccessor.UserId();
		}

		public async Task<ProcessResponse<UpdateRoomResponse>> Handle(UpdateRoomCommand request, CancellationToken cancellationToken)
		{
			var response = new UpdateRoomResponse();

			using (var transaction = await this._databaseContext.Database.BeginTransactionAsync())
			{
				var room = await this._databaseContext.Rooms.Include(r => r.RoomBeds).Where(r => r.Id == request.Id).FirstOrDefaultAsync();

				if (room == null)
				{
					return new ProcessResponse<UpdateRoomResponse>
					{
						HasError = true,
						IsSuccess = false,
						Message = "Unable to find room to update."
					};
				}

				room.ModifiedAt = DateTime.UtcNow;
				room.ModifiedById = this._userId;
				room.Name = request.Name;
				room.CategoryId = request.CategoryId;
				room.FloorSectionName = request.FloorSectionName;
				room.FloorSubSectionName = request.FloorSubSectionName;
				room.TypeKey = request.TypeKey;

				var roomBedsToInsert = new List<RoomBed>();
				var roomBedsToUpdate = new List<RoomBed>();
				var roomBedsToDelete = new List<RoomBed>();

				var checkedRoomBedIds = new HashSet<Guid>();

				foreach(var roomBed in request.Beds)
				{
					if(roomBed.Id == null)
					{
						roomBedsToInsert.Add(new RoomBed
						{
							Id = Guid.NewGuid(),
							ExternalId = null,
							IsAutogeneratedFromReservationSync = false,
							Name = roomBed.Name,
							RoomId = room.Id,
							IsClean = false,
							IsCleaningInProgress = false,
							IsDoNotDisturb = false,
							IsOccupied = false,
							IsOutOfOrder = false,
						});
					}
					else
					{
						var existingRoomBed = room.RoomBeds.FirstOrDefault(rb => rb.Id == roomBed.Id);
						if(existingRoomBed == null)
						{
							// ERROR! The room bed should exist since it has a room bed ID!
						}
						else
						{
							checkedRoomBedIds.Add(existingRoomBed.Id);

							existingRoomBed.Name = roomBed.Name;
							roomBedsToUpdate.Add(existingRoomBed);
						}
					}
				}

				roomBedsToDelete = room.RoomBeds.Where(rb => !checkedRoomBedIds.Contains(rb.Id)).ToList();

				if (roomBedsToInsert.Any())
				{
					await this._databaseContext.RoomBeds.AddRangeAsync(roomBedsToInsert);
				}

				if (roomBedsToDelete.Any())
				{
					this._databaseContext.RoomBeds.RemoveRange(roomBedsToDelete);
				}

				await this._databaseContext.SaveChangesAsync(cancellationToken);
				await transaction.CommitAsync();
			}

			return new ProcessResponse<UpdateRoomResponse>
			{
				Data = response,
				HasError = false,
				IsSuccess = true,
				Message = "Room updated."
			};
		}
	}
}
