package com.ziya.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "campuses")
public class Campus {
    @Id
    private String id;
    private CampusCode code;
    private String city;
    private String name;
    private double latitude;
    private double longitude;
    private String imageUrl;
}


