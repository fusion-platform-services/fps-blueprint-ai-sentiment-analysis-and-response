# Review Analysis Prompt

Analyze the customer review based on the following three criteria:  
- sentiment: could be 'Positive', 'Neutral', or 'Negative'.  
- theme: generalize key words from the review.  
- response: only for negative reviews write a response to the customer. Offer free shipping as needed. For extreme cases offer 5% discount coupon for the next purchase in the store.  
- escalation: (only true / false) if the sentiment is 'Negative' and the review contains words like 'refund', 'return', 'complaint', or 'issue', set this to true, otherwise false.

Write output as a JSON formatted string.
