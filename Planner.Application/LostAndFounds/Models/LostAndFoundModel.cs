﻿using Planner.Domain.Entities;
using Planner.Domain.Values;
using System;
using System.Collections.Generic;

namespace Planner.Application.LostAndFounds.Models
{
    public class LostAndFoundModel
    {

        public LostAndFoundModel()
        {
            this.Files = new List<LostAndFoundFileModel>();
        }

        public Guid Id { get; set; }
        public string Description { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Address { get; set; }
        public string City { get; set; }
        public string PostalCode { get; set; }
        public string Country { get; set; }
        public string PhoneNumber { get; set; }
        public string Email { get; set; }
        public string ReferenceNumber { get; set; }
        public string Notes { get; set; }
        public Guid? RoomId { get; set; }
        public Room Room { get; set; }
        public string ReservationId { get; set; }
        public Reservation Reservation { get; set; }
        public DateTime? LostOn { get; set; }
        public LostAndFoundStatus Status { get; set; }
        public TypeOfLoss TypeOfLoss { get; set; }

        public string PlaceOfStorage { get; set; }
        public string TrackingNumber { get; set; }

        public string HotelId { get; set; }

        public IList<LostAndFoundFileModel> Files { get; set; }
    }
}