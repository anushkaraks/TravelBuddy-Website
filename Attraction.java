package com.ziya.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "attractions")
public class Attraction {
    @Id
    private String id;
    private String name;
    private String description;
    private AttractionType type;
    private BudgetLevel budgetLevel;
    private CampusCode campusCode;
    private double latitude;
    private double longitude;
    private double distanceKm;
    private String bestTimings;
    private String safetyInfo;
    private List<String> emergencyContacts;
    private double averageRating;
    private String imageUrl;
    private List<TripType> recommendedTripTypes;
}


