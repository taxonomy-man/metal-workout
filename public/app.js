// ==========================
//      FIREBASE CONFIG
// ==========================

// === KLISTRA IN DIN FIREBASE CONFIG HÄR ===
const firebaseConfig = {
  apiKey: "AIzaSyBBThE5Pk5ygO_Op1s90T4v_XVmmS1C6Kk", // Ersatt
  authDomain: "workoutapp-cdae9.firebaseapp.com", // Ersatt
  projectId: "workoutapp-cdae9", // Ersatt
  storageBucket: "workoutapp-cdae9.firebasestorage.app", // Ersatt
  messagingSenderId: "282326588660", // Ersatt
  appId: "1:282326588660:web:e9dd3c6a2b196c7550d2a1", // Ersatt
  measurementId: "G-EEP1SGJPB1" // Tillagd
};
// ==========================================

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics(); // Tillagd för Analytics
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ==========================
//      ADMIN CONFIG
// ==========================
// Lägg till din egen e-postadress här för att aktivera admin-fliken
const ADMIN_EMAIL = "taxonomyrules@gmail.com"; // <<< VIKTIGT: ÄNDRA DENNA!

// ==========================
//      PROGRAM DEFINITION (Keep as is)
// ==========================
const program = { /* ... (Keep the same program definition as v1.1) ... */
     // Helper function to parse rep range string like "6-8"
    parseRepRange: (repString) => {
        if (!repString || typeof repString !== 'string') return { min: 0, max: 0 };
        if (repString.toLowerCase() === 'amrap') return { min: 1, max: Infinity }; // AMRAP has min 1
        const parts = repString.split('-').map(n => parseInt(n.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { min: Math.min(parts[0], parts[1]), max: Math.max(parts[0], parts[1]) };
        } else if (parts.length === 1 && !isNaN(parts[0])) {
            return { min: parts[0], max: parts[0] }; // Handle single number reps
        }
        return { min: 0, max: 0 }; // Fallback
    },
    days: [ /* ... same days data ... */
        // Dag 1
        {
            name: "Dag 1: Push & Ben",
            exercises: [
                { id: "d1e1", name: "Knäböj", sets: 4, reps: "6-8", rest: 150, type: 'reps', note: "Vecka 9-12: 4-6 reps." },
                { id: "d1e2", name: "Bänkpress", sets: 4, reps: "6-8", rest: 120, type: 'reps', note: "Vecka 9-12: 4-6 reps." },
                { id: "d1e3", name: "Stående axelpress", sets: 3, reps: "8-10", rest: 120, type: 'reps', note: "Vecka 9-12: 4-6 reps." },
                { id: "d1e4", name: "Chins", sets: 3, reps: "AMRAP", rest: 120, type: 'amrap' },
                { id: "d1e5", name: "Bulgarian split squat", sets: 2, reps: "10-12", rest: 90, type: 'bilateral-reps' },
                { id: "d1e6", name: "Plankan", sets: 3, duration: "30-60", rest: 60, type: 'time' }
            ]
        },
        // Dag 2
        {
            name: "Dag 2: Pull & Baksida",
            exercises: [
                { id: "d2e1", name: "Marklyft", sets: 4, reps: "6-8", rest: 180, type: 'reps' },
                { id: "d2e2", name: "Rodd med skivstång", sets: 4, reps: "8-10", rest: 120, type: 'reps' },
                { id: "d2e3", name: "Overhead triceps extension", sets: 3, reps: "10-12", rest: 90, type: 'reps' },
                { id: "d2e4", name: "Bicepscurls", sets: 3, reps: "10-12", rest: 90, type: 'reps' },
                { id: "d2e5", name: "Rumänsk marklyft", sets: 3, reps: "10-12", rest: 120, type: 'reps' },
                { id: "d2e6", name: "Sidoplankan", sets: 2, duration: "30-45", rest: 60, type: 'bilateral-time' }
            ]
        }
     ]
};

// ==========================
//      STATE VARIABLES (currentUser added)
// ==========================
let currentUser = null; // Håller info om inloggad användare (uid, email)
let currentWorkout = null;
let currentExerciseIndex = 0;
let currentSetIndex = 0;
let nextWorkoutDay = 1; // Laddas från Firestore
let workoutHistory = []; // Laddas från Firestore
let timerIntervalId = null;
let restEndTime = null;
let synth = null;
let wakeLock = null;
let progressionChart = null;
let adminViewingUserId = null; // Vilken användares data admin tittar på
let adminWorkoutHistory = []; // Separat historik för adminvyn

// ==========================
//      DOM ELEMENTS CACHE (Add login/admin elements)
// ==========================
const loginSection = document.getElementById('login-section');
const mainContent = document.getElementById('main-content');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const authErrorP = document.getElementById('auth-error');
const startWorkoutSection = document.getElementById('start-workout-section');
const activeWorkoutSection = document.getElementById('active-workout-section');
const nextWorkoutDaySpan = document.getElementById('next-workout-day');
const activeWorkoutTitle = document.getElementById('active-workout-title');
const timerSection = document.getElementById('timer-section');
const timerDisplay = document.getElementById('timer-display');
const currentExerciseSection = document.getElementById('current-exercise-section');
const exerciseName = document.getElementById('exercise-name');
const exerciseProgress = document.getElementById('exercise-progress');
const exerciseTarget = document.getElementById('exercise-target');
const exerciseRest = document.getElementById('exercise-rest');
const exerciseNote = document.getElementById('exercise-note');
const recommendationContainer = document.getElementById('recommendation-container');
const setsContainer = document.getElementById('sets-container');
const workoutCompleteSection = document.getElementById('workout-complete-section');
const completedDaySpan = document.getElementById('completed-day');
const historyList = document.getElementById('history-list');
const noHistoryMessage = document.getElementById('no-history-message');
const notificationsBtn = document.getElementById('notifications-btn');
const prevExerciseBtn = document.getElementById('prev-exercise-btn');
const nextExerciseBtn = document.getElementById('next-exercise-btn');
const statsExerciseSelect = document.getElementById('stats-exercise-select');
const chartCanvas = document.getElementById('progressionChart');
const noStatsMessage = document.getElementById('no-stats-message');
const workoutOverview = document.getElementById('workout-overview');
const workoutOverviewList = document.getElementById('workout-overview-list');
const toggleOverviewBtn = document.getElementById('toggle-overview-btn');
const adminTab = document.getElementById('tab-admin');
const adminUserInput = document.getElementById('admin-user-input');
const adminViewEmailInput = document.getElementById('admin-view-email');
const adminErrorP = document.getElementById('admin-error');
const adminLoadingDiv = document.getElementById('admin-loading');
const adminDataDisplayDiv = document.getElementById('admin-data-display');
const adminViewingEmailSpan = document.getElementById('admin-viewing-email');
const adminNextDaySpan = document.getElementById('admin-next-day');
const adminHistoryList = document.getElementById('admin-history-list');
const adminNoHistoryP = document.getElementById('admin-no-history');

// ==========================
//      UTILITY FUNCTIONS (Keep as is)
// ==========================
const formatTime = (seconds) => { /* ... */
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
 };
// saveState and loadState are replaced by Firestore functions
const showTab = (tabId) => { /* ... */
    const mainContents = document.querySelectorAll('#main-content section.tab-content'); // Target sections inside #main-content
    const mainButtons = document.querySelectorAll('#main-tabs .tab-button');
    mainContents.forEach(content => content.classList.toggle('active', content.id === `content-${tabId}`));
    mainButtons.forEach(button => button.classList.toggle('active', button.id === `tab-${tabId}`));
    if (workoutOverview && !workoutOverview.classList.contains('hidden')) {
         workoutOverview.classList.add('hidden');
         toggleOverviewBtn.innerHTML = '<i class="fas fa-list-ul"></i> <span class="hidden md:inline ml-1">Översikt</span>';
    }
 };
const playSound = async (note = 'C4', duration = '8n') => { /* ... */
     // Försök starta Tone.js context om det inte körs (kräver interaktion)
    if (Tone.context.state !== 'running') {
        try { await Tone.start(); console.log("Tone.js context started on demand."); }
        catch (error) { console.error("Failed to start Tone.js context:", error); return; }
    }
    // Skapa synth om den inte finns och context är redo
    if (!synth && Tone.context.state === 'running') {
        try {
            synth = new Tone.Synth({ oscillator: { type: 'fatsawtooth', spread: 40, count: 3 }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5 } }).toDestination();
            const dist = new Tone.Distortion(0.4).toDestination(); synth.connect(dist);
        } catch (error) { console.error("Failed to create Tone.Synth:", error); return; }
    }
     // Spela endast om synth finns och context är igång
     if (synth && Tone.context.state === 'running') {
        try { synth.triggerAttackRelease(note, duration); }
        catch (error) { console.error("Tone.js playback error:", error); }
     }
 };
const vibrateDevice = (pattern = [100, 50, 100]) => { /* ... */
     if ('vibrate' in navigator) { try { navigator.vibrate(pattern); } catch (e) { console.error("Vibration error:", e); } }
 };
const showWorkoutNotification = (title, body) => { /* ... */
     if ('Notification' in window && Notification.permission === 'granted') {
         if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
             navigator.serviceWorker.controller.postMessage({ type: 'show-notification', options: { title, body, icon: 'icons/icon-192x192.png', vibrate: [150, 50, 150] } });
         } else {
             try { new Notification(title, { body, icon: 'icons/icon-192x192.png', vibrate: [150, 50, 150] }); } catch (e) { console.error("Fallback notification error:", e); }
         }
    } else if ('Notification' in window && Notification.permission === 'default') { notificationsBtn.classList.remove('hidden'); }
 };
const requestNotificationPermission = () => { /* ... */
     if (!('Notification' in window)) { alert('Your browser does not support notifications.'); return; }
    Notification.requestPermission().then(permission => {
        notificationsBtn.classList.add('hidden');
        if (permission === 'granted') { showWorkoutNotification('Metal Workout', 'Notifications Activated!'); }
    });
 };
const findLastIndex = (array, predicate) => { /* ... */
     for (let i = array.length - 1; i >= 0; i--) { if (predicate(array[i])) return i; } return -1;
 };
const roundWeight = (weight) => { /* ... */
     if (weight <= 0) return 0; return Math.round(weight / 1.25) * 1.25;
 };
const calculateEpley1RM = (weight, reps) => { /* ... */
     if (!weight || !reps || reps < 1 || weight <= 0) return 0; const effectiveReps = Math.min(reps, 12); return weight * (1 + effectiveReps / 30);
 };

// ==========================
//      FIRESTORE FUNCTIONS (NEW)
// ==========================

// Get reference to the user's data document in Firestore
const getUserDocRef = (userId) => {
    if (!userId) return null;
    return db.collection('userData').doc(userId);
};

// Load user data (history and next day) from Firestore
const loadUserData = async () => {
    if (!currentUser) return;
    const userDocRef = getUserDocRef(currentUser.uid);
    if (!userDocRef) return;

    console.log("Attempting to load data for user:", currentUser.uid);
    try {
        const docSnap = await userDocRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            workoutHistory = data.workoutHistory || [];
            nextWorkoutDay = data.nextWorkoutDay || 1;
            // Ensure history is sorted after loading
            workoutHistory.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            console.log("Data loaded from Firestore:", { nextWorkoutDay, historyCount: workoutHistory.length });
        } else {
            // No document yet, use defaults
            console.log("No existing user document found, using defaults.");
            workoutHistory = [];
            nextWorkoutDay = 1;
            // Optional: Create the document with defaults?
            // await saveUserData();
        }
    } catch (error) {
        console.error("Error loading user data from Firestore:", error);
        // Fallback to defaults or show error?
        workoutHistory = [];
        nextWorkoutDay = 1;
        alert("Kunde inte ladda din data från molnet. Använder standardvärden.");
    } finally {
        // Update UI regardless of success/failure
        updateStartScreen();
        populateStatsDropdown();
        renderHistory();
        renderStatistics(); // Render stats based on loaded data
    }
};

// Save user data (history and next day) to Firestore
const saveUserData = async () => {
    if (!currentUser) return;
    const userDocRef = getUserDocRef(currentUser.uid);
    if (!userDocRef) return;

    const dataToSave = {
        nextWorkoutDay: nextWorkoutDay,
        workoutHistory: workoutHistory,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp() // Add timestamp
    };

    console.log("Attempting to save data for user:", currentUser.uid);
    try {
        // Use set with merge: true to create or update the document
        await userDocRef.set(dataToSave, { merge: true });
        console.log("User data saved successfully to Firestore.");
    } catch (error) {
        console.error("Error saving user data to Firestore:", error);
        alert("Kunde inte spara data till molnet. Försök igen senare.");
        // Optionally: Implement offline persistence/retry logic here if needed
    }
};


// ==========================
//      AUTHENTICATION FUNCTIONS (NEW)
// ==========================

// Handle user login with Google Popup
const loginWithGoogle = () => {
    authErrorP.classList.add('hidden'); // Hide previous errors
    auth.signInWithPopup(googleProvider)
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = result.credential;
            const token = credential.accessToken;
            // The signed-in user info.
            const user = result.user;
            console.log("User logged in:", user.email);
            // No need to explicitly call handleAuthStateChange, it's triggered automatically
        }).catch((error) => {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            // The email of the user's account used.
            const email = error.email;
            // The firebase.auth.AuthCredential type that was used.
            const credential = error.credential;
            console.error("Login Error:", errorCode, errorMessage);
            authErrorP.textContent = `Inloggningsfel: ${errorMessage}`;
            authErrorP.classList.remove('hidden');
        });
};

// Handle user logout
const logoutUser = () => {
    auth.signOut().then(() => {
        console.log("User logged out.");
        // State will be cleared by handleAuthStateChange
    }).catch((error) => {
        console.error("Logout Error:", error);
        alert("Utloggning misslyckades.");
    });
};

// Listen for authentication state changes
const handleAuthStateChange = (user) => {
    if (user) {
        // User is signed in.
        currentUser = {
            uid: user.uid,
            email: user.email
        };
        console.log("Auth state changed: User is logged in", currentUser.email);
        userEmailSpan.textContent = currentUser.email;
        userInfo.classList.remove('hidden');
        loginSection.classList.add('hidden');
        mainContent.classList.remove('hidden');

        // Show Admin tab if user is admin
        adminTab.classList.toggle('hidden', user.email !== ADMIN_EMAIL);

        // Load user data from Firestore
        loadUserData();

    } else {
        // User is signed out.
        console.log("Auth state changed: User is logged out");
        currentUser = null;
        // Clear local state
        workoutHistory = [];
        nextWorkoutDay = 1;
        currentWorkout = null; // Reset any active workout
        // Reset UI
        userInfo.classList.add('hidden');
        loginSection.classList.remove('hidden');
        mainContent.classList.add('hidden');
        adminTab.classList.add('hidden'); // Hide admin tab on logout
        // Clear UI elements that depend on data
        renderHistory();
        populateStatsDropdown();
        renderStatistics(); // Clear stats graph
        updateStartScreen();
        // Reset admin view if it was open
        adminDataDisplayDiv.classList.add('hidden');
        adminViewEmailInput.value = '';
        adminErrorP.classList.add('hidden');
        adminLoadingDiv.classList.add('hidden');

    }
};

// ==========================
//      PROGRESSION HELPERS (Keep as is)
// ==========================
const findLastWorkoutDataForExercise = (exerciseId, targetDayIndex, historySource = workoutHistory) => { // Added historySource parameter
    const relevantHistory = historySource.filter(w => w.dayIndex === targetDayIndex);
    for (let i = relevantHistory.length - 1; i >= 0; i--) {
        const workout = relevantHistory[i];
        const exerciseData = workout.exercises.find(ex => ex.id === exerciseId);
        const firstCompletedSet = exerciseData?.setsData.find(s => s.completed);
        if (firstCompletedSet) { return { workoutDate: workout.startTime, exercise: exerciseData, firstCompletedSet: firstCompletedSet }; }
    } return null;
 };
const getPreviousWeightSuggestion = (exerciseId, targetDayIndex) => { /* ... */
    const lastData = findLastWorkoutDataForExercise(exerciseId, targetDayIndex); // Uses current user's history
    if (!lastData || !lastData.firstCompletedSet) return null; const set = lastData.firstCompletedSet;
    if (set.weight !== null && set.weight !== undefined) { return typeof set.weight === 'object' ? set.weight : { L: set.weight, R: set.weight }; }
    else if (set.reps !== null && lastData.exercise.type === 'amrap') { return { reps: set.reps }; }
    else if (set.time !== null) { return typeof set.time === 'object' ? set.time : { L: set.time, R: set.time }; } return null;
 };
const getWeightIncreaseRecommendation = (exerciseId, targetDayIndex) => { /* ... */
    const lastData = findLastWorkoutDataForExercise(exerciseId, targetDayIndex); // Uses current user's history
    if (!lastData || !lastData.firstCompletedSet || ['time', 'bilateral-time', 'amrap'].includes(lastData.exercise.type)) { return null; }
    const exerciseDef = program.days[targetDayIndex - 1].exercises.find(ex => ex.id === exerciseId);
    const repRange = program.parseRepRange(exerciseDef.reps);
    const lastWeight = lastData.firstCompletedSet.weight;
    const lastExerciseSets = lastData.exercise.setsData.filter(s => s.completed);
    if (lastExerciseSets.length === 0 || repRange.max === 0) return null;
    const reachedTopRange = lastExerciseSets.every(s => { if (exerciseDef.type === 'bilateral-reps') { return s.reps?.L >= repRange.max && s.reps?.R >= repRange.max; } else { return s.reps >= repRange.max; } });
    if (reachedTopRange) {
        let recommendedWeight;
        if (exerciseDef.type === 'bilateral-reps') { recommendedWeight = { L: lastWeight?.L > 0 ? roundWeight(lastWeight.L + 2.5) : 0, R: lastWeight?.R > 0 ? roundWeight(lastWeight.R + 2.5) : 0 }; }
        else { recommendedWeight = roundWeight((lastWeight || 0) + 2.5); }
         return { weight: recommendedWeight, reason: `You hit ${repRange.max} reps on all sets last time!` };
    } return null;
 };

// ==========================
//      WORKOUT LOGIC (Modify finishWorkout to save to Firestore)
// ==========================
const startWorkout = async (dayIndex) => { /* ... */
    await playSound('E3', '4n');
    const dayData = program.days[dayIndex - 1];
    const exercisesCopy = JSON.parse(JSON.stringify(dayData.exercises)).map(ex => ({ ...ex, setsData: Array(ex.sets).fill(null).map(() => ({ weight: null, reps: null, time: null, completed: false, skipped: false })) }));
    currentWorkout = { dayIndex: dayIndex, dayName: dayData.name, startTime: new Date().toISOString(), exercises: exercisesCopy };
    currentExerciseIndex = 0; currentSetIndex = 0;
    updateWorkoutView();
    workoutOverview.classList.add('hidden');
    toggleOverviewBtn.innerHTML = '<i class="fas fa-list-ul"></i> <span class="hidden md:inline ml-1">Översikt</span>';
    startWorkoutSection.classList.add('hidden'); activeWorkoutSection.classList.remove('hidden');
    timerSection.classList.add('hidden'); workoutCompleteSection.classList.add('hidden'); currentExerciseSection.classList.remove('hidden');
    requestWakeLock();
 };
const updateWorkoutView = () => { /* ... */
    if (!currentWorkout) return;
    const exercise = currentWorkout.exercises[currentExerciseIndex];
    const totalExercises = currentWorkout.exercises.length;
    activeWorkoutTitle.textContent = currentWorkout.dayName;
    exerciseName.textContent = exercise.name;
    exerciseProgress.textContent = `Exercise ${currentExerciseIndex + 1} of ${totalExercises}`;
    let targetText = "";
    if (exercise.type === 'reps' || exercise.type === 'amrap') targetText = `${exercise.sets} × ${exercise.reps}`;
    else if (exercise.type === 'time') targetText = `${exercise.sets} × ${exercise.duration}s`;
    else if (exercise.type === 'bilateral-reps') targetText = `${exercise.sets} × ${exercise.reps} / side`;
    else if (exercise.type === 'bilateral-time') targetText = `${exercise.sets} × ${exercise.duration}s / side`;
    exerciseTarget.textContent = targetText;
    exerciseRest.textContent = `${exercise.rest} seconds`;
    exerciseNote.textContent = exercise.note || "";
    exerciseNote.classList.toggle('hidden', !exercise.note);
    prevExerciseBtn.disabled = currentExerciseIndex === 0;
    nextExerciseBtn.innerHTML = (currentExerciseIndex === totalExercises - 1) ? `Finish <i class="fas fa-flag-checkered"></i>` : `Next <i class="fas fa-arrow-right"></i>`;
    nextExerciseBtn.classList.toggle('btn-success', currentExerciseIndex < totalExercises - 1);
    nextExerciseBtn.classList.toggle('btn-primary', currentExerciseIndex === totalExercises - 1);
    const recommendation = getWeightIncreaseRecommendation(exercise.id, currentWorkout.dayIndex); // Uses current user's history
    recommendationContainer.innerHTML = '';
    if (recommendation) {
        let recText = `<i class="fas fa-bolt text-yellow-400 mr-2"></i>Recommendation: Increase to `;
        if (exercise.type === 'bilateral-reps') { recText += `${recommendation.weight.L}kg (L) / ${recommendation.weight.R}kg (R).`; }
        else { recText += `${recommendation.weight}kg.`; }
        recText += ` (${recommendation.reason})`;
        recommendationContainer.innerHTML = `<div class="recommendation-box">${recText}</div>`;
    }
    renderSets();
    if (!workoutOverview.classList.contains('hidden')) { renderWorkoutOverview(); }
};
const renderSets = () => { /* ... */
    if (!currentWorkout) return;
    setsContainer.innerHTML = '';
    const exercise = currentWorkout.exercises[currentExerciseIndex];
    const previousData = getPreviousWeightSuggestion(exercise.id, currentWorkout.dayIndex); // Uses current user's history

    exercise.setsData.forEach((setData, setIndex) => {
        const setRow = document.createElement('div'); setRow.className = 'set-row';
        const isCompleted = setData.completed; const isSkipped = setData.skipped;
        const isCurrent = setIndex === currentSetIndex && !isCompleted && !isSkipped && !timerIntervalId;
        const baseId = `ex${currentExerciseIndex}-set${setIndex}`;
        let inputsHTML = ''; let suggestionHTML = '';
        const currentWeight = setData.weight ?? ''; const currentReps = setData.reps ?? ''; const currentTime = setData.time ?? '';

         if (exercise.type === 'reps' || exercise.type === 'amrap') {
            let placeholderWeight = ''; let placeholderReps = '';
            if (!isCompleted && !isSkipped && previousData?.L !== undefined) { placeholderWeight = previousData.L; suggestionHTML = `<span class="suggestion-text">(Last: ${previousData.L}kg)</span>`; }
            if (!isCompleted && !isSkipped && exercise.type === 'amrap' && previousData?.reps !== undefined) { placeholderReps = previousData.reps; suggestionHTML += `<span class="suggestion-text ml-1">(Last: ${previousData.reps} reps)</span>`; }
            inputsHTML = `
                <label for="${baseId}-weight">Wt:</label> <input type="number" id="${baseId}-weight" step="0.5" min="0" ${isCompleted || isSkipped ? 'disabled' : ''} value="${currentWeight}" placeholder="${placeholderWeight}"> ${suggestionHTML.includes('kg') ? suggestionHTML.match(/\(Last:.*?kg\)/)[0] : ''}
                <label for="${baseId}-reps" class="ml-2">Reps:</label> <input type="number" id="${baseId}-reps" step="1" min="0" ${isCompleted || isSkipped ? 'disabled' : ''} value="${currentReps}" placeholder="${placeholderReps}"> ${suggestionHTML.includes('reps') ? suggestionHTML.match(/\(Last:.*?reps\)/)[0] : ''}
            `;
        } else if (exercise.type === 'time') {
            let placeholderTime = '';
            if (!isCompleted && !isSkipped && previousData?.L !== undefined) { placeholderTime = previousData.L; suggestionHTML = `<span class="suggestion-text">(Last: ${previousData.L}s)</span>`; }
            inputsHTML = `<label for="${baseId}-time">Time:</label> <input type="number" id="${baseId}-time" step="1" min="0" ${isCompleted || isSkipped ? 'disabled' : ''} value="${currentTime}" placeholder="${placeholderTime}"> ${suggestionHTML}`;
        } else if (exercise.type === 'bilateral-reps') {
            let placeholderWeightL = '', placeholderWeightR = '', suggestionL = '', suggestionR = '';
            if (!isCompleted && !isSkipped && previousData?.L !== undefined) { placeholderWeightL = previousData.L; suggestionL = `<span class="suggestion-text">(L: ${previousData.L}kg)</span>`; }
            if (!isCompleted && !isSkipped && previousData?.R !== undefined) { placeholderWeightR = previousData.R; suggestionR = `<span class="suggestion-text">(R: ${previousData.R}kg)</span>`; }
            inputsHTML = `
                <div class="w-full md:w-auto flex items-center gap-1 flex-wrap"> <label for="${baseId}-weight-L">Wt L:</label> <input type="number" id="${baseId}-weight-L" step="0.5" min="0" ${isCompleted || isSkipped ? 'disabled' : ''} value="${currentWeight?.L ?? ''}" placeholder="${placeholderWeightL}"> ${suggestionL} <label for="${baseId}-reps-L" class="ml-2">Reps L:</label> <input type="number" id="${baseId}-reps-L" step="1" min="0" ${isCompleted || isSkipped ? 'disabled' : ''} value="${currentReps?.L ?? ''}"> </div>
                <div class="w-full md:w-auto flex items-center gap-1 flex-wrap mt-1 md:mt-0"> <label for="${baseId}-weight-R">Wt R:</label> <input type="number" id="${baseId}-weight-R" step="0.5" min="0" ${isCompleted || isSkipped ? 'disabled' : ''} value="${currentWeight?.R ?? ''}" placeholder="${placeholderWeightR}"> ${suggestionR} <label for="${baseId}-reps-R" class="ml-2">Reps R:</label> <input type="number" id="${baseId}-reps-R" step="1" min="0" ${isCompleted || isSkipped ? 'disabled' : ''} value="${currentReps?.R ?? ''}"> </div>`;
        } else if (exercise.type === 'bilateral-time') {
            let placeholderTimeL = '', placeholderTimeR = '', suggestionL = '', suggestionR = '';
            if (!isCompleted && !isSkipped && previousData?.L !== undefined) { placeholderTimeL = previousData.L; suggestionL = `<span class="suggestion-text">(L: ${previousData.L}s)</span>`; }
            if (!isCompleted && !isSkipped && previousData?.R !== undefined) { placeholderTimeR = previousData.R; suggestionR = `<span class="suggestion-text">(R: ${previousData.R}s)</span>`; }
            inputsHTML = `
                 <div class="w-full md:w-auto flex items-center gap-1 flex-wrap"> <label for="${baseId}-time-L">Time L:</label> <input type="number" id="${baseId}-time-L" step="1" min="0" ${isCompleted || isSkipped ? 'disabled' : ''} value="${currentTime?.L ?? ''}" placeholder="${placeholderTimeL}"> ${suggestionL} </div>
                 <div class="w-full md:w-auto flex items-center gap-1 flex-wrap mt-1 md:mt-0"> <label for="${baseId}-time-R">Time R:</label> <input type="number" id="${baseId}-time-R" step="1" min="0" ${isCompleted || isSkipped ? 'disabled' : ''} value="${currentTime?.R ?? ''}" placeholder="${placeholderTimeR}"> ${suggestionR} </div>`;
        }

        let statusText = isCompleted ? 'Done' : (isSkipped ? 'Skipped' : 'Pending'); let statusClass = isCompleted ? 'set-complete' : (isSkipped ? 'set-skipped' : 'set-pending');
        let actionButtonsHTML = '';
         if (!isCompleted && !isSkipped) {
             actionButtonsHTML = ` <button class="btn btn-success btn-sm" onclick="logSet(${setIndex})" ${timerIntervalId ? 'disabled' : ''}><i class="fas fa-check"></i> Log</button> <button class="btn btn-warning btn-sm" onclick="skipSet(${setIndex})" ${timerIntervalId ? 'disabled' : ''}><i class="fas fa-forward"></i> Skip</button> `;
         } else { actionButtonsHTML = `<button class="btn btn-secondary btn-sm" onclick="resetSet(${setIndex})" ${timerIntervalId ? 'disabled' : ''}><i class="fas fa-undo"></i> Reset</button>`; }

        setRow.innerHTML = ` <span class="set-info ${isCurrent ? 'text-red-500' : ''}">Set ${setIndex + 1}</span> <div class="set-inputs"> ${inputsHTML} </div> <div class="set-actions"> ${actionButtonsHTML} </div> <span class="set-status ${statusClass}">${statusText}</span>`;
        setsContainer.appendChild(setRow);
    });
 };
const logSet = (setIndex) => { /* ... */
    if (!currentWorkout || timerIntervalId) return;
    const exercise = currentWorkout.exercises[currentExerciseIndex]; const setData = exercise.setsData[setIndex]; const baseId = `ex${currentExerciseIndex}-set${setIndex}`;
    try {
        if (exercise.type === 'reps' || exercise.type === 'amrap') { setData.weight = parseFloat(document.getElementById(`${baseId}-weight`).value || document.getElementById(`${baseId}-weight`).placeholder || 0); setData.reps = parseInt(document.getElementById(`${baseId}-reps`).value || document.getElementById(`${baseId}-reps`).placeholder || 0); }
        else if (exercise.type === 'time') { setData.time = parseInt(document.getElementById(`${baseId}-time`).value || document.getElementById(`${baseId}-time`).placeholder || 0); }
        else if (exercise.type === 'bilateral-reps') { setData.weight = { L: parseFloat(document.getElementById(`${baseId}-weight-L`).value || document.getElementById(`${baseId}-weight-L`).placeholder || 0), R: parseFloat(document.getElementById(`${baseId}-weight-R`).value || document.getElementById(`${baseId}-weight-R`).placeholder || 0) }; setData.reps = { L: parseInt(document.getElementById(`${baseId}-reps-L`).value || document.getElementById(`${baseId}-reps-L`).placeholder || 0), R: parseInt(document.getElementById(`${baseId}-reps-R`).value || document.getElementById(`${baseId}-reps-R`).placeholder || 0) }; }
        else if (exercise.type === 'bilateral-time') { setData.time = { L: parseInt(document.getElementById(`${baseId}-time-L`).value || document.getElementById(`${baseId}-time-L`).placeholder || 0), R: parseInt(document.getElementById(`${baseId}-time-R`).value || document.getElementById(`${baseId}-time-R`).placeholder || 0) }; }
        setData.completed = true; setData.skipped = false;
    } catch (error) { console.error("Error reading input values:", error); alert("Could not read values. Check inputs."); return; }
    currentSetIndex++; const allSetsDone = exercise.setsData.every(s => s.completed || s.skipped);
    if (!allSetsDone && currentSetIndex < exercise.sets) { startTimer(exercise.rest); }
    else { renderSets(); playSound('A4', '8n'); if (!workoutOverview.classList.contains('hidden')) { renderWorkoutOverview(); } }
 };
const skipSet = (setIndex) => { /* ... */
    if (!currentWorkout || timerIntervalId) return; const exercise = currentWorkout.exercises[currentExerciseIndex];
    exercise.setsData[setIndex] = { ...exercise.setsData[setIndex], completed: false, skipped: true, weight: null, reps: null, time: null }; currentSetIndex++;
    const allSetsDone = exercise.setsData.every(s => s.completed || s.skipped);
    if (!allSetsDone && currentSetIndex < exercise.sets) { startTimer(exercise.rest); }
    else { renderSets(); playSound('E3', '4n'); if (!workoutOverview.classList.contains('hidden')) { renderWorkoutOverview(); } }
 };
const resetSet = (setIndex) => { /* ... */
     if (!currentWorkout || timerIntervalId) return; const exercise = currentWorkout.exercises[currentExerciseIndex];
     exercise.setsData[setIndex] = { ...exercise.setsData[setIndex], completed: false, skipped: false, weight: null, reps: null, time: null };
     const firstPendingIndex = exercise.setsData.findIndex(s => !s.completed && !s.skipped); currentSetIndex = (firstPendingIndex !== -1) ? firstPendingIndex : 0;
     renderSets(); playSound('C3', '8n'); if (!workoutOverview.classList.contains('hidden')) { renderWorkoutOverview(); }
 };
const startTimer = (durationInSeconds) => { /* ... */
    if (timerIntervalId) clearInterval(timerIntervalId); restEndTime = Date.now() + durationInSeconds * 1000;
    timerSection.classList.remove('hidden'); currentExerciseSection.classList.add('hidden'); renderSets();
    const update = () => {
        const now = Date.now(); const timeLeft = Math.max(0, Math.round((restEndTime - now) / 1000)); timerDisplay.textContent = formatTime(timeLeft);
        if (timeLeft <= 0) { clearInterval(timerIntervalId); timerIntervalId = null; timerSection.classList.add('hidden'); currentExerciseSection.classList.remove('hidden'); playSound('G4', '4n'); vibrateDevice([200, 100, 200]); showWorkoutNotification('Metal Workout', 'Rest Over! Engage!'); renderSets(); }
        else if (timeLeft <= 3 && timeLeft > 0) { playSound('F#4', '16n'); vibrateDevice([50]); }
    }; update(); timerIntervalId = setInterval(update, 1000);
 };
const skipRest = () => { /* ... */
    if (timerIntervalId) { clearInterval(timerIntervalId); timerIntervalId = null; timerSection.classList.add('hidden'); currentExerciseSection.classList.remove('hidden'); playSound('D#4', '8n'); vibrateDevice([100]); renderSets(); }
 };
const nextExercise = () => { /* ... */
    if (!currentWorkout || timerIntervalId) return; const allSetsDone = currentWorkout.exercises[currentExerciseIndex].setsData.every(s => s.completed || s.skipped);
    if (!allSetsDone && !confirm("Not all sets logged. Proceed anyway?")) return;
    if (currentExerciseIndex < currentWorkout.exercises.length - 1) { currentExerciseIndex++; currentSetIndex = 0; updateWorkoutView(); playSound('F4'); }
    else { currentExerciseSection.classList.add('hidden'); workoutCompleteSection.classList.remove('hidden'); completedDaySpan.textContent = currentWorkout.dayIndex; playSound('C5', '2n'); workoutOverview.classList.add('hidden'); toggleOverviewBtn.innerHTML = '<i class="fas fa-list-ul"></i> <span class="hidden md:inline ml-1">Översikt</span>'; }
 };
const previousExercise = () => { /* ... */
     if (!currentWorkout || timerIntervalId || currentExerciseIndex === 0) return;
     if (workoutCompleteSection.classList.contains('active')) { workoutCompleteSection.classList.add('hidden'); currentExerciseSection.classList.remove('hidden'); } else { currentExerciseIndex--; }
     const firstPendingIndex = currentWorkout.exercises[currentExerciseIndex].setsData.findIndex(s => !s.completed && !s.skipped); currentSetIndex = (firstPendingIndex !== -1) ? firstPendingIndex : 0;
     updateWorkoutView(); playSound('D4');
 };
const confirmAbandonWorkout = () => { if (confirm("Abandon session? Progress will not be saved!")) { abandonWorkout(); } }; // Tydligare varning
const abandonWorkout = () => { /* ... */
    if (timerIntervalId) clearInterval(timerIntervalId); timerIntervalId = null;
    currentWorkout = null; currentExerciseIndex = 0; currentSetIndex = 0;
    activeWorkoutSection.classList.add('hidden'); startWorkoutSection.classList.remove('hidden');
    workoutOverview.classList.add('hidden'); toggleOverviewBtn.innerHTML = '<i class="fas fa-list-ul"></i> <span class="hidden md:inline ml-1">Översikt</span>';
    updateStartScreen(); releaseWakeLock(); playSound('C2', '1n');
};

// MODIFIED finishWorkout to save to Firestore
const finishWorkout = async () => { // Added async
    if (!currentWorkout) return;

    // Spara passet lokalt i state först
    currentWorkout.endTime = new Date().toISOString();
    const finishedWorkoutData = JSON.parse(JSON.stringify(currentWorkout)); // Skapa en kopia
    workoutHistory.push(finishedWorkoutData);
    nextWorkoutDay = currentWorkout.dayIndex === 1 ? 2 : 1;

    // Spara den uppdaterade historiken och nästa dag till Firestore
    await saveUserData(); // Wait for save to complete

    // Återställ state och UI
    const lastDay = currentWorkout.dayIndex;
    currentWorkout = null; currentExerciseIndex = 0; currentSetIndex = 0;
    workoutCompleteSection.classList.add('hidden'); activeWorkoutSection.classList.add('hidden');
    startWorkoutSection.classList.remove('hidden');
    workoutOverview.classList.add('hidden');
    toggleOverviewBtn.innerHTML = '<i class="fas fa-list-ul"></i> <span class="hidden md:inline ml-1">Översikt</span>';
    updateStartScreen();
    populateStatsDropdown();
    renderHistory();
    showTab('history');
    releaseWakeLock();
    showWorkoutNotification('Metal Workout', `Session ${lastDay} Conquered & Saved to Cloud!`);
};

const updateStartScreen = () => { /* ... */
    nextWorkoutDaySpan.textContent = `Dag ${nextWorkoutDay}`;
    const btn1 = document.getElementById('start-day1-btn'); const btn2 = document.getElementById('start-day2-btn');
    btn1.classList.toggle('ring-2', nextWorkoutDay === 1); btn1.classList.toggle('ring-offset-2', nextWorkoutDay === 1); btn1.classList.toggle('ring-red-500', nextWorkoutDay === 1);
    btn2.classList.toggle('ring-2', nextWorkoutDay === 2); btn2.classList.toggle('ring-offset-2', nextWorkoutDay === 2); btn2.classList.toggle('ring-red-500', nextWorkoutDay === 2);
 };

// ==========================
//      WORKOUT OVERVIEW (Keep as is)
// ==========================
const toggleWorkoutOverview = () => { /* ... */
    if (!currentWorkout) return; const isHidden = workoutOverview.classList.toggle('hidden');
    if (!isHidden) { renderWorkoutOverview(); toggleOverviewBtn.innerHTML = '<i class="fas fa-times"></i> <span class="hidden md:inline ml-1">Dölj</span>'; }
    else { toggleOverviewBtn.innerHTML = '<i class="fas fa-list-ul"></i> <span class="hidden md:inline ml-1">Översikt</span>'; }
 };
const renderWorkoutOverview = () => { /* ... */
    if (!currentWorkout || !workoutOverviewList) return; workoutOverviewList.innerHTML = '';
    currentWorkout.exercises.forEach((exercise, index) => {
        const li = document.createElement('li'); const isCurrent = index === currentExerciseIndex;
        const isCompleted = exercise.setsData.every(s => s.completed || s.skipped);
        const isSkipped = !isCompleted && exercise.setsData.some(s => s.skipped);
        li.textContent = `${index + 1}. ${exercise.name}`; if (isCurrent) { li.classList.add('current-exercise'); }
        const icon = document.createElement('i'); icon.classList.add('fas', 'status-icon');
        if (isCompleted) { icon.classList.add('fa-check-circle'); }
        else if (isSkipped && index < currentExerciseIndex) { icon.classList.add('fa-times-circle'); }
        else if (isCurrent) { icon.classList.add('fa-spinner', 'fa-spin'); }
        li.appendChild(icon); workoutOverviewList.appendChild(li);
    });
 };

// ==========================
//      HISTORY LOGIC (Render based on provided history)
// ==========================
// Modified renderHistory to accept history data as parameter
const renderHistory = (historyData = workoutHistory, targetListElement = historyList, noHistoryElement = noHistoryMessage, isAdminView = false) => {
    targetListElement.innerHTML = ''; // Clear the target list
    if (!historyData || historyData.length === 0) {
        noHistoryElement.classList.remove('hidden');
        return;
    }
    noHistoryElement.classList.add('hidden');

    // Sort by startTime descending to show newest first
    [...historyData].sort((a, b) => new Date(b.startTime) - new Date(a.startTime)).forEach((workout) => {
        const entryDiv = document.createElement('div');
        // Add specific class for admin view styling
        entryDiv.className = `history-entry ${isAdminView ? 'admin-history-entry' : ''}`;
        const startTime = new Date(workout.startTime);
        const endTime = workout.endTime ? new Date(workout.endTime) : null;
        const duration = endTime ? Math.round((endTime - startTime) / (1000 * 60)) : 'N/A';
        let exercisesHTML = '<ul class="list-none mt-2 space-y-1">';
        workout.exercises.forEach(ex => {
            if (ex.setsData.some(s => s.completed || s.skipped)) {
                exercisesHTML += `<li class="history-exercise text-sm"><strong class="text-gray-200">${ex.name}:</strong> `;
                let setsSummary = ex.setsData.map((s) => {
                    if (s.completed) {
                        let e1RM = 0;
                        if ((ex.type === 'reps' || ex.type === 'amrap') && s.weight > 0 && s.reps > 0) { e1RM = calculateEpley1RM(s.weight, s.reps); }
                        else if (ex.type === 'bilateral-reps' && s.weight?.L > 0 && s.reps?.L > 0) { const e1RM_L = calculateEpley1RM(s.weight.L, s.reps.L); const e1RM_R = calculateEpley1RM(s.weight.R, s.reps.R); e1RM = Math.max(e1RM_L, e1RM_R); }
                        let setText = '';
                        if (ex.type === 'reps' || ex.type === 'amrap') setText = `${s.weight}kg x ${s.reps}`;
                        else if (ex.type === 'time') setText = `${s.time}s`;
                        else if (ex.type === 'bilateral-reps') setText = `L:${s.weight.L}x${s.reps.L} / R:${s.weight.R}x${s.reps.R}`;
                        else if (ex.type === 'bilateral-time') setText = `L:${s.time.L}s / R:${s.time.R}s`;
                        if (e1RM > 0) { setText += ` <span class="text-gray-400">(~${e1RM.toFixed(1)}kg e1RM)</span>`; }
                        return setText;
                    } else if (s.skipped) { return `<span class="text-yellow-500">(Skipped)</span>`; }
                    return null;
                }).filter(s => s !== null).join(', ');
                exercisesHTML += `${setsSummary}</li>`;
            }
        }); exercisesHTML += '</ul>';
        entryDiv.innerHTML = `
            <h4 class="text-xl font-semibold">${workout.dayName}</h4>
            <p class="text-xs text-gray-400">Date: ${startTime.toLocaleDateString('sv-SE')} ${startTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })} | Duration: ${endTime ? `${duration} min` : '(Incomplete)'}</p>
            ${exercisesHTML}`;
        targetListElement.appendChild(entryDiv);
    });
};
// Clear history is removed - data managed in Firestore

// ==========================
//      STATISTICS LOGIC (Render based on provided history)
// ==========================
// Modified populateStatsDropdown to accept history data
const populateStatsDropdown = (historyData = workoutHistory) => {
     const exerciseNames = new Set();
    historyData.forEach(workout => {
        workout.exercises.forEach(ex => {
            if (ex.setsData.some(s => s.completed && (s.weight !== null && s.weight !== undefined))) {
                 exerciseNames.add(JSON.stringify({id: ex.id, name: ex.name}));
            }
        });
    });
     const currentSelection = statsExerciseSelect.value;
    statsExerciseSelect.innerHTML = '<option value="">-- Select Exercise --</option>';
     const sortedExercises = Array.from(exerciseNames).map(jsonString => JSON.parse(jsonString)).sort((a, b) => a.name.localeCompare(b.name));
    sortedExercises.forEach(exInfo => {
        const option = document.createElement('option'); option.value = exInfo.id; option.textContent = exInfo.name; statsExerciseSelect.appendChild(option);
    });
     if (sortedExercises.some(ex => ex.id === currentSelection)) { statsExerciseSelect.value = currentSelection; }
     else if (sortedExercises.length > 0) { statsExerciseSelect.value = sortedExercises[0].id; }
     else { statsExerciseSelect.value = ""; }
 };
 // Modified renderStatistics to accept history data
const renderStatistics = (historyData = workoutHistory) => {
    const selectedExerciseId = statsExerciseSelect.value;
    const ctx = chartCanvas.getContext('2d');
    if (progressionChart) { progressionChart.destroy(); progressionChart = null; }

    if (!selectedExerciseId || historyData.length === 0) {
        noStatsMessage.classList.remove('hidden'); chartCanvas.classList.add('hidden'); return;
    }

    const labels = []; const maxWeightData = []; const estimated1RMData = [];
    // Ensure data is sorted chronologically for the chart
    [...historyData].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).forEach(workout => {
        const exerciseData = workout.exercises.find(ex => ex.id === selectedExerciseId);
        if (exerciseData) {
            let sessionMaxWeight = 0; let sessionMaxE1RM = 0;
            let sessionDate = new Date(workout.startTime).toLocaleDateString('sv-SE');
            exerciseData.setsData.forEach(set => {
                if (set.completed) {
                    let currentWeight = 0; let currentE1RM = 0;
                    if ((exerciseData.type === 'reps' || exerciseData.type === 'amrap') && set.weight > 0) { currentWeight = set.weight; currentE1RM = calculateEpley1RM(set.weight, set.reps); }
                    else if (exerciseData.type === 'bilateral-reps') { currentWeight = Math.max(set.weight?.L || 0, set.weight?.R || 0); const e1RM_L = calculateEpley1RM(set.weight?.L, set.reps?.L); const e1RM_R = calculateEpley1RM(set.weight?.R, set.reps?.R); currentE1RM = Math.max(e1RM_L, e1RM_R); }
                    if (currentWeight > sessionMaxWeight) { sessionMaxWeight = currentWeight; }
                    if (currentE1RM > sessionMaxE1RM) { sessionMaxE1RM = currentE1RM; }
                }
            });
            if (sessionMaxWeight > 0) {
                 // Don't check for duplicate dates here, allow multiple points per date if needed
                 labels.push(sessionDate);
                 maxWeightData.push(sessionMaxWeight);
                 estimated1RMData.push(sessionMaxE1RM);
            }
        }
    });

    if (labels.length === 0) { noStatsMessage.classList.remove('hidden'); chartCanvas.classList.add('hidden'); return; }
    noStatsMessage.classList.add('hidden'); chartCanvas.classList.remove('hidden');

    Chart.defaults.color = '#9ca3af'; Chart.defaults.borderColor = '#4b5563';
    progressionChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [ { label: 'Max Weight (kg)', data: maxWeightData, borderColor: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.5)', tension: 0.1, yAxisID: 'yWeight', borderWidth: 2, pointBackgroundColor: '#f87171', pointRadius: 4, }, { label: 'Est. 1RM (kg)', data: estimated1RMData, borderColor: '#60a5fa', backgroundColor: 'rgba(96, 165, 250, 0.5)', tension: 0.1, yAxisID: 'y1RM', borderWidth: 2, pointBackgroundColor: '#60a5fa', pointRadius: 4, hidden: false } ] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false, }, plugins: { title: { display: true, text: `Progress: ${statsExerciseSelect.options[statsExerciseSelect.selectedIndex].text}`, color: '#f3f4f6', font: { size: 14, family: "'Metal Mania', cursive" } }, legend: { labels: { color: '#e5e7eb', font: {size: 10} } }, tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#f3f4f6', bodyColor: '#e5e7eb', callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += context.parsed.y.toFixed(1) + ' kg'; } return label; } } } }, scales: { x: { title: { display: true, text: 'Date', color: '#9ca3af' }, grid: { color: '#374151' }, ticks: { color: '#9ca3af', font: {size: 10} } }, yWeight: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Max Wt (kg)', color: '#f87171' }, beginAtZero: true, grid: { color: '#374151' }, ticks: { color: '#f87171', font: {size: 10} } }, y1RM: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'e1RM (kg)', color: '#60a5fa' }, beginAtZero: true, grid: { drawOnChartArea: false, }, ticks: { color: '#60a5fa', font: {size: 10} } } } }
    });
 };

// ==========================
//      ADMIN FUNCTIONS (NEW)
// ==========================

// Function to load data for a specific user (by email) in the admin view
const loadAdminUserData = async () => {
    const targetEmail = adminViewEmailInput.value.trim();
    if (!targetEmail) {
        adminErrorP.textContent = "Ange en e-postadress.";
        adminErrorP.classList.remove('hidden');
        return;
    }

    adminErrorP.classList.add('hidden');
    adminDataDisplayDiv.classList.add('hidden');
    adminLoadingDiv.classList.remove('hidden');
    adminWorkoutHistory = []; // Clear previous admin view data

    console.log(`Admin attempting to load data for email: ${targetEmail}`);

    try {
        // Find user by email (Requires Firestore query, might need specific rules/indexing)
        // Note: Querying by email directly in Firestore can be inefficient or require specific setup.
        // A better approach in a real app might be to store user profiles with email and query that,
        // or have an admin backend function. For simplicity here, we assume we can find the UID somehow
        // or that the admin knows the UID. Let's *simulate* finding the user document based on email
        // by querying the userData collection. This might require Firestore rules allowing admin read access.

        // **Important Security Note:** Allowing direct query by email might expose user UIDs if rules aren't strict.
        // A safer approach involves a Cloud Function or dedicated admin interface.
        // This implementation is simplified for demonstration.

        // Attempt to find the user document matching the email.
        // We'll assume the document ID is the user's UID and we store the email inside the document.
        // This requires reading potentially many documents if not indexed properly.
        // A direct lookup by UID is much more efficient if the admin knows the UID.

        // Let's try a query (might fail depending on Firestore rules and indexing)
        const usersRef = db.collection('userData');
        // We need the UID, not the email directly, to fetch the doc.
        // This part is tricky without a proper user lookup system.
        // **Simplification:** Let's assume the admin *enters the UID* instead of email for now.
        // We'll change the input field label later if needed.
        // Let's pretend the input is for UID for now.
        const targetUserId = targetEmail; // Assuming input is UID for now

        const userDocRef = getUserDocRef(targetUserId);
        if (!userDocRef) {
            throw new Error("Invalid User ID format.");
        }

        const docSnap = await userDocRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();
            adminWorkoutHistory = data.workoutHistory || [];
            const adminNextDay = data.nextWorkoutDay || 1;
            // Sort history
            adminWorkoutHistory.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

            console.log(`Admin loaded data for UID ${targetUserId}:`, { adminNextDay, historyCount: adminWorkoutHistory.length });

            // Display the data
            adminViewingEmailSpan.textContent = targetUserId; // Show UID for now
            adminNextDaySpan.textContent = `Dag ${adminNextDay}`;
            renderHistory(adminWorkoutHistory, adminHistoryList, adminNoHistoryP, true); // Render in admin list
            adminDataDisplayDiv.classList.remove('hidden');
        } else {
            console.log(`No data found for UID: ${targetUserId}`);
            adminErrorP.textContent = `Ingen data hittades för användar-ID: ${targetUserId}`;
            adminErrorP.classList.remove('hidden');
        }

    } catch (error) {
        console.error("Error loading admin user data:", error);
        adminErrorP.textContent = `Fel vid hämtning av data: ${error.message}`;
        adminErrorP.classList.remove('hidden');
    } finally {
        adminLoadingDiv.classList.add('hidden');
    }
};


// ==========================
//      SCREEN WAKE LOCK API & PWA Service Worker (Keep as is)
// ==========================
const requestWakeLock = async () => { /* ... */
     if ('wakeLock' in navigator) { try { if (wakeLock && !wakeLock.released) return; wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); console.log('Screen Wake Lock is active.'); } catch (err) { console.error(`Wake Lock request failed: ${err.name}, ${err.message}`); wakeLock = null; } } else { console.warn('Screen Wake Lock API not supported.'); }
 };
const releaseWakeLock = async () => { /* ... */
     if (wakeLock !== null && wakeLock.released === false) { try { await wakeLock.release(); } catch (err) { console.error(`Wake Lock release failed: ${err.name}, ${err.message}`); } finally { wakeLock = null; } }
 };
document.addEventListener('visibilitychange', async () => { /* ... */
     if (document.visibilityState === 'visible' && currentWorkout && (!wakeLock || wakeLock.released)) { await requestWakeLock(); }
 });
const registerServiceWorker = () => { /* ... */
     if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('service-worker.js').then(registration => { console.log('Service Worker registered:', registration.scope); }).catch(error => { console.error('Service Worker registration failed:', error); }); navigator.serviceWorker.addEventListener('message', event => { console.log('Message from SW:', event.data); }); }); } else { console.warn('Service Worker not supported.'); }
 };

// ==========================
//      INITIALIZATION (Add Auth Listener)
// ==========================
document.addEventListener('DOMContentLoaded', () => {
    // Listen for auth state changes BEFORE trying to load data
    auth.onAuthStateChanged(handleAuthStateChange);

    // Don't load data here initially, wait for auth state change
    // loadState(); // Removed - handled by onAuthStateChanged

    showTab('workout'); // Default tab (will be hidden if not logged in)
    // updateStartScreen(); // Handled by loadUserData
    // renderStatistics(); // Handled by loadUserData

     // Check notification permission (can be done before login)
    if ('Notification' in window && Notification.permission === 'default') {
        notificationsBtn.classList.remove('hidden');
    }

    // Add event listener for the login button
    const loginButton = document.getElementById('login-btn');
    if (loginButton) {
        loginButton.addEventListener('click', loginWithGoogle);
    } else {
        console.error("Login button (login-btn) not found!");
    }

    registerServiceWorker(); // Registrera SW
}); 