class ActivityTracker {
    // Start tracking when user opens a feature
    static async startActivity(featureType) {
        // Check if user is logged in
        const userId = localStorage.getItem('userId');
        if (!userId) return;  // Don't track if not logged in

        // Tell server user started activity
        try {
            const response = await fetch('https://bless-sel-exp.onrender.com/api/activity/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: userId,
                    featureType: featureType  // Which BLESS feature
                })
            });
            
            // Save activity ID for later
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('currentActivityId', data.activityId);
            }
        } catch (error) {
            console.error('Could not start tracking:', error);
        }
    }

    // Stop tracking when user leaves
    static async endActivity() {
        // Get saved activity ID
        const activityId = localStorage.getItem('currentActivityId');
        if (!activityId) return;  // Nothing to end

        // Tell server user finished
        try {
            await fetch('https://bless-sel-exp.onrender.com/api/activity/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    activityId: activityId 
                })
            });
            // Clean up
            localStorage.removeItem('currentActivityId');
        } catch (error) {
            console.error('Could not end tracking:', error);
        }
    }
}