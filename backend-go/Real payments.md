Real payments. The fundraising page only records the amount on screen. Nothing is saved and no money moves (FundraisingPage.js:13 notes Razorpay as a later phase).
Gift cards that work. The codes are generated in the browser and nothing on the server stores or redeems them (GiftCard.js:17). There are no reward partners yet.
Admin panel. The admin role exists, but it can only be set directly in the database. There's no admin screen or API for managing users, verifying NGOs, or handling disputes and abuse.
NGO verification. Anyone can pick the Organization role and claim food. There's no check of NGO registration documents.
Forgot / reset password. There's no endpoint or page for it.
Notifications. Email is only used for the signup code. Donors aren't told when their food is claimed or delivered, NGOs aren't told about new donations nearby, and there's no push notification or SMS.
Live updates. Dashboards only change when the page is reloaded.
Paging through lists. Lists return only the newest 500 items (store.go:79), and the Learner Corner page has no paging either.
Static content. Learner Corner content is written into the page code rather than coming from the backend.
Food photos. Donations have no photo upload. The freshness check isn't linked to the donation form, and the two camera pages (ArDetection.js and ImageRecognition.js) do almost the same thing.
Edit profile, change password, delete account. None of these exist.
Tests. Only donation-rule tests and forecast tests exist. Login, organizations, volunteers, biogas and stats have no Go tests, and the frontend has no component or browser tests.
Going live. Nothing shows the app has actually been deployed yet. Still needed:
an email provider
the frontend on Vercel
a paid database (Render's free Postgres expires after 30 days)
error tracking and monitoring
database backups