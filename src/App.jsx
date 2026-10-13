
import { useState, useEffect } from "react";
import "./index.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "https://autocare-backend-uy8p.onrender.com" : "http://localhost:8080")
).replace(/\/+$/, "");

function App() {
  const [page, setPage] = useState("home");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("autocareUser");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [authForm, setAuthForm] = useState({ fullName: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
const [editingId, setEditingId] = useState(null);
const [vehicleForm, setVehicleForm] = useState({
  name: "",
  model: "",
  registration: "",
  year: "",
});

const emptyVehicleForm = {
  name: "",
  model: "",
  registration: "",
  year: "",
};
const [bookings, setBookings] = useState([]);

const [serviceForm, setServiceForm] = useState({
  vehicleId: "",
  serviceType: "General Servicing",
  date: "",
  time: "",
  notes: "",
});

const authHeaders = () => {
  try {
    const savedUser = JSON.parse(localStorage.getItem("autocareUser") || "null");
    return savedUser?.token ? { Authorization: `Bearer ${savedUser.token}` } : {};
  } catch {
    return {};
  }
};

useEffect(() => {
  if (!currentUser?.token) return;
  fetch(`${API_BASE_URL}/api/vehicles`, { headers: authHeaders() })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load vehicles");
      }
      return response.json();
    })
    .then((data) => {
      setVehicles(data);
    })
    .catch((error) => {
      console.error("Error loading vehicles:", error);
      alert("Could not load vehicles. Please check whether the backend is running.");
    });
}, [currentUser]);


useEffect(() => {
  if (!currentUser?.token) return;
  fetch(`${API_BASE_URL}/api/bookings`, { headers: authHeaders() })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load bookings");
      }
      return response.json();
    })
    .then((data) => {
      setBookings(data);
    })
    .catch((error) => {
      console.error("Error loading bookings:", error);
      alert("Could not load bookings. Please check the backend.");
    });
}, [currentUser]);


const handleAuthSubmit = async (event) => {
  event.preventDefault();
  setAuthError("");
  setAuthLoading(true);

  const isRegister = page === "register";
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/${isRegister ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authForm),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || (isRegister ? "Could not create your account." : "Could not log in."));
    }

    setCurrentUser(result);
    localStorage.setItem("autocareUser", JSON.stringify(result));
    setAuthForm({ fullName: "", email: "", password: "" });
    setPage("home");
    alert(isRegister ? "Account created successfully! You are now logged in." : `Welcome back, ${result.fullName}!`);
  } catch (error) {
    setAuthError(error.message || "Unable to connect to AutoCare. Make sure the backend is running.");
  } finally {
    setAuthLoading(false);
  }
};

const requireLogin = (destination) => {
  if (!currentUser) {
    setPage("login");
    setAuthError("Please log in or create an account to continue.");
    return;
  }
  setPage(destination);
};

const handleLogout = async () => {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: authHeaders(),
    });
  } catch (error) {
    console.warn("Could not contact the server to end the session.", error);
  }
  localStorage.removeItem("autocareUser");
  setCurrentUser(null);
  setVehicles([]);
  setBookings([]);
  setPage("home");
};

const handleVehicleSubmit = async (event) => {
  event.preventDefault();

  try {
    const vehicleData = {
      name: vehicleForm.name,
      model: vehicleForm.model,
      registration: vehicleForm.registration,
      year: Number(vehicleForm.year),
    };

    let response;

    if (editingId !== null) {
      response = await fetch(
        `${API_BASE_URL}/api/vehicles/${editingId}`,
        {
          method: "PUT",
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(vehicleData),
        }
      );
    } else {
      response = await fetch(
        `${API_BASE_URL}/api/vehicles`,
        {
          method: "POST",
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(vehicleData),
        }
      );
    }

    if (!response.ok) {
      throw new Error("Failed to save vehicle");
    }

    const savedVehicle = await response.json();

    if (editingId !== null) {
      setVehicles((previousVehicles) =>
        previousVehicles.map((vehicle) =>
          vehicle.id === editingId ? savedVehicle : vehicle
        )
      );

      alert("Vehicle updated successfully!");
      setEditingId(null);
    } else {
      setVehicles((previousVehicles) => [
        ...previousVehicles,
        savedVehicle,
      ]);

      alert("Vehicle added successfully!");
    }

    setVehicleForm({ ...emptyVehicleForm });
  } catch (error) {
    console.error("Error saving vehicle:", error);
    alert("Could not save vehicle. Please check the backend.");
  }
};

const handleEditVehicle = (vehicle) => {
  setVehicleForm({
    name: vehicle.name,
    model: vehicle.model,
    registration: vehicle.registration,
    year: vehicle.year,
  });
  setEditingId(vehicle.id);
};


const handleDeleteVehicle = async (id) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/vehicles/${id}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete vehicle");
    }

    setVehicles((previousVehicles) =>
      previousVehicles.filter((vehicle) => vehicle.id !== id)
    );

    if (editingId === id) {
      setEditingId(null);
      setVehicleForm({ ...emptyVehicleForm });
    }

    alert("Vehicle deleted successfully!");
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    alert("Could not delete vehicle. Please check the backend.");
  }
};

const handleBookingSubmit = async (event) => {
  event.preventDefault();

  const selectedVehicle = vehicles.find(
    (vehicle) =>
      String(vehicle.id) === String(serviceForm.vehicleId)
  );

  if (!selectedVehicle) {
    alert("Please select a vehicle first.");
    return;
  }

  const newBooking = {
    vehicleId: Number(serviceForm.vehicleId),
    serviceType: serviceForm.serviceType,
    date: serviceForm.date,
    time: serviceForm.time,
    notes: serviceForm.notes,
    vehicleName: selectedVehicle.name,
    vehicleModel: selectedVehicle.model,
    status: "Pending",
  };

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/bookings`,
      {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newBooking),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to save booking");
    }

    const savedBooking = await response.json();

    setBookings((previousBookings) => [
      ...previousBookings,
      savedBooking,
    ]);

    setServiceForm({
      vehicleId: "",
      serviceType: "General Servicing",
      date: "",
      time: "",
      notes: "",
    });

    alert("Your service booking has been saved successfully!");
  } catch (error) {
    console.error("Error saving booking:", error);
    alert("Could not save booking. Please check the backend.");
  }
};


const handleStatusChange = async (bookingId, newStatus) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/bookings/${bookingId}/status`,
      {
        method: "PUT",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update booking status");
    }

    const updatedBooking = await response.json();

    setBookings((previousBookings) =>
      previousBookings.map((booking) =>
        booking.id === updatedBooking.id
          ? updatedBooking
          : booking
      )
    );

    alert("Booking status updated successfully!");
  } catch (error) {
    console.error("Error updating booking status:", error);
    alert("Could not update booking status. Please try again.");
  }
};

const handleDeleteBooking = async (bookingId) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this service booking?"
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/bookings/${bookingId}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete booking");
    }

    setBookings((previousBookings) =>
      previousBookings.filter(
        (booking) => booking.id !== bookingId
      )
    );

    alert("Service booking deleted successfully!");
  } catch (error) {
    console.error("Error deleting booking:", error);
    alert("Could not delete booking. Please try again.");
  }
};

if (page === "login" || page === "register") {
  const isLogin = page === "login";
  return (
    <div className="auth-page">
      <div className="auth-card">
        <a href="#" className="logo" onClick={(event) => { event.preventDefault(); setPage("home"); }}>
          <span className="logo-icon">A</span>
          AutoCare
        </a>

        <h1>{isLogin ? "Welcome back!" : "Create your account"}</h1>
        <p className="auth-subtitle">
          {isLogin
            ? "Login to manage your vehicle services."
            : "Join AutoCare to organize your vehicle maintenance. New accounts start with customer access."}
        </p>

        <form onSubmit={handleAuthSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="auth-full-name">Full Name</label>
              <input
                id="auth-full-name"
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={authForm.fullName}
                onChange={(event) => setAuthForm({ ...authForm, fullName: event.target.value })}
                maxLength={100}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={authForm.email}
              onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={isLogin ? "Enter your password" : "Create a password (8+ characters)"}
              minLength={8}
              maxLength={100}
              value={authForm.password}
              onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
              required
            />
          </div>

          {authError && <p className="auth-error" role="alert">{authError}</p>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={authLoading}>
            {authLoading ? "Please wait…" : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => { setAuthError(""); setPage(isLogin ? "register" : "login"); }}
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>

        <button className="back-button" onClick={() => { setAuthError(""); setPage("home"); }}>
          ← Back to Home
        </button>
      </div>
    </div>
  );
}

if (page === "vehicles") {
  return (
    <div className="vehicle-page">
      <header className="vehicle-header">
        <a href="#" className="logo" onClick={(event) => {
          event.preventDefault();
          setPage("home");
        }}>
          <span className="logo-icon">A</span>
          AutoCare
        </a>

        <button className="btn btn-outline" onClick={() => setPage("home")}>
          ← Back to Home
        </button>
      </header>

      <main className="vehicle-container">
        <div className="dashboard-heading">
          <div>
            <span className="tag">VEHICLE MANAGEMENT</span>
            <h1>My Vehicles</h1>
            <p>Keep your vehicle information organized in one place.</p>
          </div>

          <div className="vehicle-count">
            <span>{vehicles.length}</span>
            <small>{vehicles.length === 1 ? "Vehicle" : "Vehicles"} added</small>
          </div>
        </div>

        <div className="vehicle-layout">
          {currentUser?.role !== "MECHANIC" && <section className="vehicle-form-card">
            <h2>{editingId !== null ? "Edit Vehicle" : "Add a Vehicle"}</h2>
            <p className="card-description">
              Enter your vehicle details below.
            </p>

            <form onSubmit={handleVehicleSubmit}>
              <div className="form-group">
                <label>Vehicle Name</label>
                <input
                  value={vehicleForm.name}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, name: event.target.value })
                  }
                  placeholder="e.g. My Car"
                  required
                />
              </div>

              <div className="form-group">
                <label>Make / Model</label>
                <input
                  value={vehicleForm.model}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, model: event.target.value })
                  }
                  placeholder="e.g. Hyundai i20"
                  required
                />
              </div>

              <div className="form-group">
                <label>Registration Number</label>
                <input
                  value={vehicleForm.registration}
                  onChange={(event) =>
                    setVehicleForm({
                      ...vehicleForm,
                      registration: event.target.value,
                    })
                  }
                  placeholder="e.g. TS09AB1234"
                  required
                />
              </div>

              <div className="form-group">
                <label>Manufacturing Year</label>
                <input
                  type="number"
                  min="1950"
                  max={new Date().getFullYear() + 1}
                  value={vehicleForm.year}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, year: event.target.value })
                  }
                  placeholder="e.g. 2023"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary vehicle-submit">
                {editingId !== null ? "Save Changes" : "+ Add Vehicle"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  className="btn btn-outline vehicle-cancel"
                  onClick={() => {
                    setEditingId(null);
                    setVehicleForm({ ...emptyVehicleForm });
                  }}
                >
                  Cancel Editing
                </button>
              )}
            </form>
          </section>}

          <section className="vehicle-list-section">
            <h2>{currentUser?.role === "MECHANIC" ? "Customer Vehicles" : "Registered Vehicles"}</h2>
            <p className="card-description">
              {vehicles.length === 0
                ? "Your added vehicles will appear here."
                : `You have ${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} listed.`}
            </p>

            {vehicles.length === 0 ? (
              <div className="vehicle-empty">
                <div className="empty-car-icon">🚘</div>
                <h3>No vehicles added yet</h3>
                <p>Add your first vehicle using the form.</p>
              </div>
            ) : (
              <div className="vehicle-list">
                {vehicles.map((vehicle) => (
                  <article className="vehicle-card" key={vehicle.id}>
                    <div className="vehicle-card-top">
                      <div className="vehicle-icon">🚗</div>
                      {currentUser?.role !== "MECHANIC" && <div className="vehicle-card-actions">
                        <button
                          type="button"
                          className="small-action"
                          onClick={() => handleEditVehicle(vehicle)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="small-action delete-action"
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                        >
                          Delete
                        </button>
                      </div>}
                    </div>

                    <h3>{vehicle.name}</h3>
                    <p className="vehicle-model">{vehicle.model}</p>

                    <div className="vehicle-detail">
                      <span>Registration</span>
                      <strong>{vehicle.registration}</strong>
                    </div>

                    <div className="vehicle-detail">
                      <span>Year</span>
                      <strong>{vehicle.year}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}


if (page === "booking") {
  return (
    <div className="booking-page">
      <header className="vehicle-header">
        <a
          href="#"
          className="logo"
          onClick={(event) => {
            event.preventDefault();
            setPage("home");
          }}
        >
          <span className="logo-icon">A</span>
          AutoCare
        </a>

        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setPage("home")}
        >
          ← Back to Home
        </button>
      </header>

      <main className="booking-container">
        <div className="booking-heading">
          <span className="tag">SERVICE APPOINTMENTS</span>
          <h1>{currentUser?.role === "MECHANIC" ? "Service Desk" : "Book a Service"}</h1>
          <p>
            {currentUser?.role === "MECHANIC"
              ? "Review incoming bookings and update their service status."
              : "Schedule your vehicle service at a time that works for you."}
          </p>
        </div>

        {currentUser?.role !== "MECHANIC" && vehicles.length === 0 ? (
          <section className="booking-empty">
            <div className="empty-car-icon">🚗</div>
            <h2>No vehicles registered yet</h2>
            <p>
              Add your vehicle first before booking a service.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setPage("vehicles")}
            >
              Add a Vehicle
            </button>
          </section>
        ) : (
          <div className="booking-layout">
            {currentUser?.role !== "MECHANIC" && <section className="booking-form-card">
              <h2>Appointment Details</h2>
              <p className="card-description">
                Fill in the details to schedule your service.
              </p>

              <form onSubmit={handleBookingSubmit}>
                <div className="form-group">
                  <label>Select Vehicle</label>
                  <select
                    value={serviceForm.vehicleId}
                    onChange={(event) =>
                      setServiceForm({
                        ...serviceForm,
                        vehicleId: event.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Choose your vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option
                        key={vehicle.id}
                        value={String(vehicle.id)}
                      >
                        {vehicle.name} — {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Service Type</label>
                  <select
                    value={serviceForm.serviceType}
                    onChange={(event) =>
                      setServiceForm({
                        ...serviceForm,
                        serviceType: event.target.value,
                      })
                    }
                    required
                  >
                    <option>General Servicing</option>
                    <option>Oil Change</option>
                    <option>Brake Inspection</option>
                    <option>Engine Repair</option>
                    <option>Tyre Check</option>
                    <option>Battery Check</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Preferred Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={serviceForm.date}
                    onChange={(event) =>
                      setServiceForm({
                        ...serviceForm,
                        date: event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Preferred Time</label>
                  <select
                    value={serviceForm.time}
                    onChange={(event) =>
                      setServiceForm({
                        ...serviceForm,
                        time: event.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Choose a time</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Additional Notes (Optional)</label>
                  <textarea
                    rows="3"
                    value={serviceForm.notes}
                    onChange={(event) =>
                      setServiceForm({
                        ...serviceForm,
                        notes: event.target.value,
                      })
                    }
                    placeholder="Describe any problem with your vehicle..."
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary booking-submit"
                >
                  Confirm Booking →
                </button>
              </form>
            </section>}

            <section className="booking-list-section">
              <h2>{currentUser?.role === "MECHANIC" ? "Incoming Service Bookings" : "My Service Bookings"}</h2>
              <p className="card-description">
                View the appointments you've added.
              </p>

              {bookings.length === 0 ? (
                <div className="booking-empty">
                  <div className="empty-car-icon">📅</div>
                  <h3>No bookings yet</h3>
                  <p>Your service appointments will appear here.</p>
                </div>
              ) : (
                <div className="booking-list">
                  {bookings.map((booking) => (
                    <article className="booking-card" key={booking.id}>
                      <div className="booking-card-top">
                        <div className="booking-icon">🔧</div>
                       
{currentUser?.role === "MECHANIC" ? (
  <select
    className="booking-status"
    value={booking.status}
    onChange={(event) => handleStatusChange(booking.id, event.target.value)}
    aria-label={`Update status for ${booking.serviceType}`}
  >
    <option value="Pending">Pending</option>
    <option value="Confirmed">Confirmed</option>
    <option value="In Progress">In Progress</option>
    <option value="Completed">Completed</option>
  </select>
) : <span className={`booking-status status-${booking.status?.toLowerCase().replaceAll(" ", "-")}`}>{booking.status}</span>}
                      </div>



{currentUser?.role === "MECHANIC" && (
  <div className="booking-actions">
    <button
      type="button"
      className="delete-booking-btn"
      onClick={() => handleDeleteBooking(booking.id)}
      title="Delete this booking"
      aria-label="Delete this booking"
    >
      <span aria-hidden="true">🗑</span>
      <span>Delete</span>
    </button>
  </div>
)}


                      <h3>{booking.serviceType}</h3>
                      <p className="vehicle-model">
                        {booking.vehicleName} — {booking.vehicleModel}
                      </p>

                      <div className="booking-detail">
                        <span>Date</span>
                        <strong>{booking.date}</strong>
                      </div>

                      <div className="booking-detail">
                        <span>Time</span>
                        <strong>
                          {booking.time === "09:00" ? "09:00 AM" :
                           booking.time === "10:00" ? "10:00 AM" :
                           booking.time === "11:00" ? "11:00 AM" :
                           booking.time === "12:00" ? "12:00 PM" :
                           booking.time === "14:00" ? "02:00 PM" :
                           booking.time === "15:00" ? "03:00 PM" :
                           booking.time === "16:00" ? "04:00 PM" :
                           booking.time}
                        </strong>
                      </div>

                      {booking.notes && (
                        <p className="booking-notes">
                          Notes: {booking.notes}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

  return (
    <div className="app">
      <nav className="navbar">
        <a href="#home" className="logo">
          <span className="logo-icon">A</span>
          AutoCare
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#services">Services</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-buttons">
          {currentUser ? (
            <>
              <span className="welcome-user">Hi, {currentUser.fullName} · {currentUser.role === "MECHANIC" ? "Mechanic" : "Customer"}</span>
              {currentUser.role === "MECHANIC" ? (
                <button className="btn btn-light" onClick={() => requireLogin("booking")}>Service Desk</button>
              ) : (
                <>
                  <button className="btn btn-light" onClick={() => requireLogin("vehicles")}>My Vehicles</button>
                  <button className="btn btn-primary" onClick={() => requireLogin("booking")}>Book Service</button>
                </>
              )}
              <button className="btn btn-outline" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button className="btn btn-light" onClick={() => setPage("login")}>Login</button>
              <button className="btn btn-primary" onClick={() => { setAuthError(""); setPage("register"); }}>Get Started</button>
            </>
          )}
        </div>
      </nav>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="tag">YOUR VEHICLE, OUR PRIORITY</span>

            <h1>
              Keep your vehicle
              <br />
              <span>running smoothly.</span>
            </h1>

            <p>
              Manage your vehicle services, book appointments,
              and keep all your maintenance records in one place.
            </p>

            <div className="hero-buttons">
             <button
  type="button"
  className="btn btn-primary"
  onClick={() => requireLogin("booking")}
>
  {currentUser?.role === "MECHANIC" ? "Open Service Desk →" : "Book a Service →"}
</button> 
              <button className="btn btn-outline">
                Explore Services
              </button>
            </div>

            <div className="hero-note">
              <span className="check">✓</span>
              Simple booking · Organized service history
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-circle">
              <div className="car-icon">🚗</div>
            </div>

            <div className="floating-card">
              <span className="status-dot"></span>
              <div>
                <strong>Vehicle care made easy</strong>
                <p>All your service details in one place</p>
              </div>
            </div>
          </div>
        </section>

        <section className="services" id="services">
          <div className="section-heading">
            <span className="tag">WHAT YOU CAN DO</span>
            <h2>Everything your vehicle needs</h2>
            <p>
              Manage your vehicle and service information
              without the hassle of manual records.
            </p>
          </div>

          <div className="service-grid">
            <article className="service-card">
              <div className="service-icon">🚘</div>
              <h3>Manage Vehicles</h3>
              <p>
                Add your vehicles and keep their basic
                information organized in one place.
              </p>
            </article>

            <article className="service-card">
              <div className="service-icon">🛠️</div>
              <h3>Book a Service</h3>
              <p>
                Request a service appointment whenever
                your vehicle needs maintenance.
              </p>
            </article>

            <article className="service-card">
              <div className="service-icon">📋</div>
              <h3>Service History</h3>
              <p>
                View previous services and check the status
                of your current service requests.
              </p>
            </article>
          </div>
        </section>

        <section className="about" id="about">
          <h2>Vehicle maintenance, made simple.</h2>
          <p>
            AutoCare helps vehicle owners keep their service
            information organized and easy to access.
          </p>
        </section>
      </main>

      <footer className="footer">
        <a href="#home" className="logo">
          <span className="logo-icon">A</span>
          AutoCare
        </a>
        <p>Vehicle service management made simple.</p>
        <span>© 2026 AutoCare</span>
      </footer>
    </div>
  );
}

export default App;