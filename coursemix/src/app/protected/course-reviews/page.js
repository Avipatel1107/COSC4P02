import React from 'react'

const CourseReviewsPage = () => {
  const reviews = [
    { id: 1, reviewer: 'John Doe', rating: 5, comment: 'Great course!' },
    { id: 2, reviewer: 'Jane Smith', rating: 4, comment: 'Very informative.' },
    { id: 3, reviewer: 'Sam Johnson', rating: 3, comment: 'Good, but could be better.' }
  ];

  return (
    <div>
      <h1>Course Reviews</h1>
      <ul>
        {reviews.map(review => (
          <li key={review.id}>
            <h2>{review.reviewer}</h2>
            <p>Rating: {review.rating}</p>
            <p>{review.comment}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CourseReviewsPage;