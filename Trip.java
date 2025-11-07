package com.ziya.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "trips")
public class Trip {
    @Id
    private String id;
    private String userId;
    private CampusCode campusCode;
    private TripType tripType;
    private BudgetLevel budgetLevel;
    private List<String> attractionIds;
    private String notes;
    private List<String> supplies;
    private Instant createdAt;
}


