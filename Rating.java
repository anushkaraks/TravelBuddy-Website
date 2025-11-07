package com.ziya.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "ratings")
public class Rating {
    @Id
    private String id;
    private String userId;
    private String attractionId;
    private int score; // 1-5
    private String comment;
    private Instant createdAt;
}


