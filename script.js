// Configuration
const CONFIG = {
    API_KEY: "f0c2dc63d0b93bf00287df1f586fc023", // Replace with your API key
    BASE_URL: "https://api.openweathermap.org/data/2.5/",
    UNITS: {
        celsius: "metric",
        fahrenheit: "imperial"
    },
    ICON_MAPPING: {
        "01d": "wi-day-sunny",
        "01n": "wi-night-clear",
        "02d": "wi-day-cloudy",
        "02n": "wi-night-alt-cloudy",
        "03d": "wi-cloud",
        "03n": "wi-cloud",
        "04d": "wi-cloudy",
        "04n": "wi-cloudy",
        "09d": "wi-rain",
        "09n": "wi-rain",
        "10d": "wi-day-rain",
        "10n": "wi-night-alt-rain",
        "11d": "wi-thunderstorm",
        "11n": "wi-thunderstorm",
        "13d": "wi-snow",
        "13n": "wi-snow",
        "50d": "wi-fog",
        "50n": "wi-fog"
    },
    STORAGE_KEYS: {
        LAST_CITY: "lastSearchedCity",
        UNIT: "preferredUnit"
    }
};

// DOM Elements
const elements = {
    cityInput: document.getElementById("cityInput"),
    searchBtn: document.getElementById("searchBtn"),
    locationBtn: document.getElementById("locationBtn"),
    unitC: document.getElementById("unitC"),
    unitF: document.getElementById("unitF"),
    errorElement: document.querySelector(".error"),
    errorText: document.getElementById("errorText"),
    loadingElement: document.querySelector(".loading"),
    currentWeather: document.querySelector(".current-weather"),
    forecastContainer: document.getElementById("forecastContainer"),
    currentYear: document.getElementById("currentYear"),
    unitDisplay: document.getElementById("unitDisplay"),
    
    // Current weather elements
    currentWeatherIcon: document.getElementById("currentWeatherIcon"),
    currentTemp: document.getElementById("currentTemp"),
    currentCity: document.getElementById("currentCity"),
    currentDescription: document.getElementById("currentDescription"),
    humidity: document.getElementById("humidity"),
    wind: document.getElementById("wind"),
    pressure: document.getElementById("pressure"),
    sunrise: document.getElementById("sunrise")
};

// App State
let appState = {
    currentUnit: "celsius",
    currentLocation: null
};

// Initialize the application
function init() {
    // Set current year in footer
    elements.currentYear.textContent = new Date().getFullYear();
    
    // Load preferences from local storage
    loadPreferences();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load weather for default city or current location
    loadInitialWeather();
}

// Load user preferences from local storage
function loadPreferences() {
    const savedUnit = localStorage.getItem(CONFIG.STORAGE_KEYS.UNIT);
    if (savedUnit) {
        appState.currentUnit = savedUnit;
        updateUnitToggle();
        updateUnitDisplay();
    }
    
    const lastCity = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_CITY);
    if (lastCity) {
        elements.cityInput.value = lastCity;
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Search button click
    elements.searchBtn.addEventListener("click", handleSearch);
    
    // Location button click
    elements.locationBtn.addEventListener("click", handleLocationSearch);
    
    // Enter key in input field
    elements.cityInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSearch();
    });
    
    // Unit toggle buttons
    elements.unitC.addEventListener("click", () => switchUnit("celsius"));
    elements.unitF.addEventListener("click", () => switchUnit("fahrenheit"));
}

// Load initial weather data
function loadInitialWeather() {
    const lastCity = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_CITY);
    if (lastCity) {
        fetchWeatherData(lastCity);
    } else {
        // Show empty state
        elements.currentWeather.style.display = "block";
    }
}

// Handle city search
function handleSearch() {
    const city = elements.cityInput.value.trim();
    
    if (!city) {
        showError("Please enter a city name");
        return;
    }
    
    fetchWeatherData(city);
}

// Handle location search
function handleLocationSearch() {
    if (!navigator.geolocation) {
        showError("Geolocation is not supported by your browser");
        return;
    }
    
    showLoading();
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            appState.currentLocation = { lat: latitude, lon: longitude };
            fetchWeatherByCoords(latitude, longitude);
        },
        (error) => {
            hideLoading();
            showError("Unable to retrieve your location");
            console.error("Geolocation error:", error);
        }
    );
}

// Fetch weather data by city name
async function fetchWeatherData(city) {
    try {
        showLoading();
        hideError();
        
        const currentUrl = `${CONFIG.BASE_URL}weather?q=${city}&units=${CONFIG.UNITS[appState.currentUnit]}&appid=${CONFIG.API_KEY}`;
        const forecastUrl = `${CONFIG.BASE_URL}forecast?q=${city}&units=${CONFIG.UNITS[appState.currentUnit]}&appid=${CONFIG.API_KEY}`;
        
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(currentUrl),
            fetch(forecastUrl)
        ]);
        
        if (!currentResponse.ok || !forecastResponse.ok) {
            throw new Error(currentResponse.status === 404 ? "City not found" : "Weather service unavailable");
        }
        
        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();
        
        updateWeatherUI(currentData, forecastData);
        
        // Save to local storage
        localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_CITY, city);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Fetch weather data by coordinates
async function fetchWeatherByCoords(lat, lon) {
    try {
        showLoading();
        hideError();
        
        const currentUrl = `${CONFIG.BASE_URL}weather?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS[appState.currentUnit]}&appid=${CONFIG.API_KEY}`;
        const forecastUrl = `${CONFIG.BASE_URL}forecast?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS[appState.currentUnit]}&appid=${CONFIG.API_KEY}`;
        
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(currentUrl),
            fetch(forecastUrl)
        ]);
        
        if (!currentResponse.ok || !forecastResponse.ok) {
            throw new Error("Weather service unavailable");
        }
        
        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();
        
        updateWeatherUI(currentData, forecastData);
        
        // Update input with location name
        elements.cityInput.value = currentData.name;
        localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_CITY, currentData.name);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Update UI with weather data
function updateWeatherUI(currentData, forecastData) {
    // Update current weather
    updateCurrentWeather(currentData);
    
    // Update forecast
    updateForecast(forecastData);
    
    // Show weather sections
    elements.currentWeather.style.display = "block";
}

// Update current weather display
function updateCurrentWeather(data) {
    const { name, main, wind, weather, sys, dt } = data;
    const iconCode = weather[0].icon;
    
    // Set weather icon
    elements.currentWeatherIcon.className = `wi ${CONFIG.ICON_MAPPING[iconCode] || "wi-day-sunny"}`;
    
    // Set temperature and location
    elements.currentTemp.textContent = Math.round(main.temp);
    elements.currentCity.textContent = name;
    elements.currentDescription.textContent = weather[0].description;
    
    // Set weather details
    elements.humidity.textContent = `${main.humidity}%`;
    elements.wind.textContent = `${Math.round(wind.speed)} ${appState.currentUnit === "celsius" ? "km/h" : "mph"}`;
    elements.pressure.textContent = `${main.pressure} hPa`;
    
    // Convert sunrise timestamp to time
    const sunriseTime = new Date(sys.sunrise * 1000);
    elements.sunrise.textContent = sunriseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Update 5-day forecast
function updateForecast(data) {
    // Clear previous forecast
    elements.forecastContainer.innerHTML = "";
    
    // Group forecast by day
    const dailyForecast = {};
    const today = new Date().toLocaleDateString();
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateString = date.toLocaleDateString();
        
        // Skip today and only take one entry per day
        if (dateString !== today && !dailyForecast[dateString]) {
            dailyForecast[dateString] = item;
        }
    });
    
    // Get the next 5 days
    const forecastDays = Object.values(dailyForecast).slice(0, 5);
    
    // Create forecast items
    forecastDays.forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString([], { weekday: 'short' });
        const iconCode = day.weather[0].icon;
        
        const forecastItem = document.createElement("div");
        forecastItem.className = "forecast-item";
        forecastItem.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-icon">
                <i class="wi ${CONFIG.ICON_MAPPING[iconCode] || "wi-day-sunny"}"></i>
            </div>
            <div class="forecast-temp">
                <span>${Math.round(day.main.temp_max)}°</span>
                <span>${Math.round(day.main.temp_min)}°</span>
            </div>
        `;
        
        elements.forecastContainer.appendChild(forecastItem);
    });
}

// Switch between Celsius and Fahrenheit
function switchUnit(unit) {
    if (appState.currentUnit === unit) return;
    
    appState.currentUnit = unit;
    localStorage.setItem(CONFIG.STORAGE_KEYS.UNIT, unit);
    
    // Update UI
    updateUnitToggle();
    updateUnitDisplay();
    
    // Reload weather data with new units
    const lastCity = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_CITY);
    if (lastCity) {
        fetchWeatherData(lastCity);
    } else if (appState.currentLocation) {
        fetchWeatherByCoords(appState.currentLocation.lat, appState.currentLocation.lon);
    }
}

function updateUnitDisplay() {
    unitDisplay.textContent = appState.currentUnit === "celsius" ? "°C" : "°F";
}

// Update unit toggle buttons
function updateUnitToggle() {
    if (appState.currentUnit === "celsius") {
        elements.unitC.classList.add("active");
        elements.unitF.classList.remove("active");
    } else {
        elements.unitF.classList.add("active");
        elements.unitC.classList.remove("active");
    }
}

// Show loading state
function showLoading() {
    elements.loadingElement.style.display = "flex";
    elements.currentWeather.style.display = "none";
}

// Hide loading state
function hideLoading() {
    elements.loadingElement.style.display = "none";
}

// Show error message
function showError(message) {
    elements.errorText.textContent = message;
    elements.errorElement.style.display = "flex";
}

// Hide error message
function hideError() {
    elements.errorElement.style.display = "none";
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", init);