﻿using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Planner.Application.Infrastructure;
using Planner.Application.Interfaces;
using Planner.Application.TaskManagement.Commands.InsertTaskConfiguration;
using Planner.Application.TaskManagement.Queries.GetTasksData;
using Planner.Common.Data;
using Planner.Common.Enums;
using Planner.Common.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Planner.Application.TaskManagement.Commands.CancelTask
{
	public class CancelTaskCommand : IRequest<ProcessResponse>
	{
		public Guid TaskId { get; set; }
	}

	public class CancelTaskCommandHandler : IRequestHandler<CancelTaskCommand, ProcessResponse>, IAmWebApplicationHandler
	{
		private readonly IDatabaseContext _databaseContext;
		private readonly ISystemTaskGenerator _systemTaskGenerator;
		private readonly ISystemEventsService _systemEventsService;
		private readonly Guid _userId;
		private readonly Guid _hotelGroupId;

		public CancelTaskCommandHandler(IDatabaseContext databaseContext, IHttpContextAccessor contextAccessor, ISystemTaskGenerator systemTaskGenerator, ISystemEventsService systemEventsService)
		{
			this._databaseContext = databaseContext;
			this._systemTaskGenerator = systemTaskGenerator;
			this._systemEventsService = systemEventsService;
			this._userId = contextAccessor.UserId();
			this._hotelGroupId = contextAccessor.HotelGroupId();
		}

		public async Task<ProcessResponse> Handle(CancelTaskCommand request, CancellationToken cancellationToken)
		{
			var task = (Domain.Entities.SystemTask)null;
			using (var transaction = await this._databaseContext.Database.BeginTransactionAsync())
			{
				task = await this._databaseContext.SystemTasks.Include(t => t.Actions).FirstOrDefaultAsync(t => t.Id == request.TaskId);

				if (task == null)
				{
					return new ProcessResponse
					{
						HasError = true,
						IsSuccess = false,
						Message = "Unable to find task."
					};
				}

				var oldValue = this._systemTaskGenerator.GenerateTaskHistoryData(task);

				task.StatusKey = TaskStatusType.CANCELLED.ToString();
				task.ModifiedAt = DateTime.UtcNow;
				task.ModifiedById = this._userId;

				var newValue = this._systemTaskGenerator.GenerateTaskHistoryData(task);

				var taskHistory = this._systemTaskGenerator.GenerateTaskHistory("ADMIN", "Task cancelled.", task, oldValue, newValue);
				await this._databaseContext.SystemTaskHistorys.AddAsync(taskHistory);

				await this._databaseContext.SaveChangesAsync(cancellationToken);
				await transaction.CommitAsync(cancellationToken);
			}

			var taskIds = new Guid[] { task.Id };
			var userIds = new List<Guid>();
			if (task.UserId.HasValue) userIds.Add(task.UserId.Value);

			await this._systemEventsService.TasksChanged(this._hotelGroupId, userIds, taskIds, "Your task has been cancelled");

			return new ProcessResponse
			{
				HasError = false,
				IsSuccess = true,
				Message = "Task cancelled."
			};
		}
	}
}
