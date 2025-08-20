// UniEvent Connect front-end logic

// Utility for localStorage
const STORAGE_KEYS = {
  events: 'unievent-events',
  registrations: 'unievent-registrations',
  studentTags: 'unievent-student-tags'
};

// Predefined tags – can be extended as more events are added
const DEFAULT_TAGS = ['tech', 'entrepreneurship', 'art', 'volunteering', 'sports', 'science', 'community'];

// Current UI mode: 'student' or 'organizer'
let currentMode = 'student';

document.addEventListener('DOMContentLoaded', () => {
  initializeData();
  // Set initial mode button state
  document.getElementById('studentModeBtn').addEventListener('click', () => switchMode('student'));
  document.getElementById('organizerModeBtn').addEventListener('click', () => switchMode('organizer'));
  switchMode('student');
});

function initializeData() {
  // If no events stored, seed some sample events
  if (!localStorage.getItem(STORAGE_KEYS.events)) {
    const sampleEvents = [
      {
        id: Date.now().toString(),
        title: 'Tech Innovation Fair',
        date: '2025-09-05',
        time: '14:00',
        venue: 'Engineering Block A',
        tags: ['tech', 'innovation'],
        capacity: 100,
        description: 'Showcase of cutting-edge projects and startups.',
        createdAt: new Date().toISOString()
      },
      {
        id: (Date.now() + 1).toString(),
        title: 'Art & Music Exhibition',
        date: '2025-09-12',
        time: '18:00',
        venue: 'Arts Hall',
        tags: ['art'],
        capacity: 50,
        description: 'Explore local artists and performances.',
        createdAt: new Date().toISOString()
      },
      {
        id: (Date.now() + 2).toString(),
        title: 'Volunteering at Community Garden',
        date: '2025-09-20',
        time: '09:00',
        venue: 'Community Garden',
        tags: ['volunteering', 'community'],
        capacity: 30,
        description: 'Help cultivate and plant for the local community.',
        createdAt: new Date().toISOString()
      }
    ];
    saveEvents(sampleEvents);
  }
  if (!localStorage.getItem(STORAGE_KEYS.registrations)) {
    saveRegistrations([]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.studentTags)) {
    localStorage.setItem(STORAGE_KEYS.studentTags, JSON.stringify([]));
  }
}

function switchMode(mode) {
  currentMode = mode;
  // Update button classes
  document.getElementById('studentModeBtn').classList.toggle('active', mode === 'student');
  document.getElementById('organizerModeBtn').classList.toggle('active', mode === 'organizer');
  // Render UI
  if (mode === 'student') {
    renderStudent();
  } else {
    renderOrganizer();
  }
}

/* LocalStorage helpers */
function getEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.events)) || [];
  } catch (err) {
    return [];
  }
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));
}

function getRegistrations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.registrations)) || [];
  } catch (err) {
    return [];
  }
}

function saveRegistrations(registrations) {
  localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify(registrations));
}

function getStudentTags() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.studentTags)) || [];
  } catch (err) {
    return [];
  }
}

function setStudentTags(tags) {
  localStorage.setItem(STORAGE_KEYS.studentTags, JSON.stringify(tags));
}

// Generate a random ticket code
function generateTicketCode() {
  return 'T' + Math.random().toString(36).substring(2, 9).toUpperCase();
}

/* Rendering functions */
function renderStudent() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Filter section
  const filterSection = document.createElement('div');
  filterSection.className = 'filter-section';
  const filterTitle = document.createElement('h2');
  filterTitle.textContent = 'Discover Events';
  filterSection.appendChild(filterTitle);

  // Tag filters
  const selectedTags = getStudentTags();
  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'filter-tags';
  const allTags = Array.from(new Set([...DEFAULT_TAGS, ...getEvents().flatMap(e => e.tags)]));
  allTags.forEach(tag => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = tag;
    checkbox.checked = selectedTags.includes(tag);
    checkbox.addEventListener('change', () => {
      let newTags = getStudentTags();
      if (checkbox.checked) {
        if (!newTags.includes(tag)) newTags.push(tag);
      } else {
        newTags = newTags.filter(t => t !== tag);
      }
      setStudentTags(newTags);
      renderStudent();
    });
    const span = document.createElement('span');
    span.textContent = tag;
    label.appendChild(checkbox);
    label.appendChild(span);
    tagsContainer.appendChild(label);
  });
  filterSection.appendChild(tagsContainer);

  // Search input
  const searchGroup = document.createElement('div');
  searchGroup.className = 'form-group';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search events by title, venue or tag';
  searchInput.addEventListener('input', () => {
    renderEventList(searchInput.value.trim().toLowerCase());
  });
  searchGroup.appendChild(searchInput);
  filterSection.appendChild(searchGroup);

  // Tickets button
  const ticketsBtn = document.createElement('button');
  ticketsBtn.className = 'primary';
  ticketsBtn.textContent = 'My Tickets';
  ticketsBtn.addEventListener('click', () => {
    renderMyTickets();
  });
  filterSection.appendChild(ticketsBtn);

  app.appendChild(filterSection);

  // Container for events list
  const eventListContainer = document.createElement('div');
  eventListContainer.id = 'eventList';
  app.appendChild(eventListContainer);

  // Initial render of events
  renderEventList('');

  function renderEventList(query) {
    const events = getEvents();
    const regs = getRegistrations();
    // Filter by selected tags
    let filtered = events.filter(e => {
      if (selectedTags.length === 0) return true;
      return e.tags.some(tag => selectedTags.includes(tag));
    });
    // Search filter
    if (query) {
      filtered = filtered.filter(e => {
        const searchStr = [e.title, e.venue, ...e.tags].join(' ').toLowerCase();
        return searchStr.includes(query);
      });
    }
    // Sort by date/time ascending
    filtered.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
    // Clear list
    eventListContainer.innerHTML = '';
    if (filtered.length === 0) {
      const noEv = document.createElement('div');
      noEv.className = 'no-events';
      noEv.textContent = 'No events found.';
      eventListContainer.appendChild(noEv);
      return;
    }
    filtered.forEach(event => {
      const card = document.createElement('div');
      card.className = 'event-card';
      const h3 = document.createElement('h3');
      h3.textContent = event.title;
      const details = document.createElement('p');
      details.textContent = `${event.date} ${event.time} | ${event.venue}`;
      const description = document.createElement('p');
      description.textContent = event.description;
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'tags';
      event.tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.textContent = tag;
        tagsDiv.appendChild(tagSpan);
      });
      // Registration state
      const regBtn = document.createElement('button');
      regBtn.className = 'primary';
      const existing = regs.find(r => r.eventId === event.id);
      const capacityFull = event.capacity && regs.filter(r => r.eventId === event.id).length >= event.capacity;
      if (existing) {
        regBtn.textContent = 'Registered';
        regBtn.disabled = true;
      } else if (capacityFull) {
        regBtn.textContent = 'Full';
        regBtn.disabled = true;
      } else {
        regBtn.textContent = 'Register';
        regBtn.addEventListener('click', () => {
          const code = generateTicketCode();
          const newReg = { eventId: event.id, code };
          const updatedRegs = [...getRegistrations(), newReg];
          saveRegistrations(updatedRegs);
          renderStudent();
          alert(`Registered successfully! Your ticket code is ${code}`);
        });
      }
      card.appendChild(h3);
      card.appendChild(details);
      card.appendChild(description);
      card.appendChild(tagsDiv);
      card.appendChild(regBtn);
      eventListContainer.appendChild(card);
    });
  }
}

function renderMyTickets() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const title = document.createElement('h2');
  title.textContent = 'My Tickets';
  app.appendChild(title);
  const regs = getRegistrations();
  if (regs.length === 0) {
    const noTicket = document.createElement('p');
    noTicket.textContent = 'You have not registered for any events yet.';
    app.appendChild(noTicket);
  } else {
    regs.forEach(reg => {
      const event = getEvents().find(e => e.id === reg.eventId);
      if (!event) return;
      const ticketDiv = document.createElement('div');
      ticketDiv.className = 'ticket';
      const titleEl = document.createElement('strong');
      titleEl.textContent = event.title;
      const info = document.createElement('p');
      info.textContent = `${event.date} ${event.time} | ${event.venue}`;
      const codeEl = document.createElement('p');
      codeEl.innerHTML = `Ticket Code: <span class="ticket-code">${reg.code}</span>`;
      ticketDiv.appendChild(titleEl);
      ticketDiv.appendChild(info);
      ticketDiv.appendChild(codeEl);
      app.appendChild(ticketDiv);
    });
  }
  // Back button
  const backBtn = document.createElement('button');
  backBtn.className = 'secondary';
  backBtn.textContent = 'Back';
  backBtn.addEventListener('click', () => {
    switchMode('student');
  });
  app.appendChild(backBtn);
}

function renderOrganizer() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const title = document.createElement('h2');
  title.textContent = 'Organizer Dashboard';
  app.appendChild(title);

  // Event creation form
  const form = document.createElement('form');
  form.id = 'eventForm';
  form.innerHTML = `
    <div class="form-group">
      <label for="title">Event Title</label>
      <input type="text" id="title" required />
    </div>
    <div class="form-group">
      <label for="date">Date</label>
      <input type="date" id="date" required />
    </div>
    <div class="form-group">
      <label for="time">Time</label>
      <input type="time" id="time" required />
    </div>
    <div class="form-group">
      <label for="venue">Venue</label>
      <input type="text" id="venue" required />
    </div>
    <div class="form-group">
      <label for="tags">Tags (comma separated)</label>
      <input type="text" id="tags" placeholder="e.g. tech, innovation" />
    </div>
    <div class="form-group">
      <label for="capacity">Capacity</label>
      <input type="number" id="capacity" min="1" placeholder="Leave blank for unlimited" />
    </div>
    <div class="form-group">
      <label for="description">Description</label>
      <textarea id="description" required></textarea>
    </div>
    <button type="submit" class="primary">Post Event</button>
  `;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const events = getEvents();
    const newEvent = {
      id: Date.now().toString(),
      title: form.querySelector('#title').value.trim(),
      date: form.querySelector('#date').value,
      time: form.querySelector('#time').value,
      venue: form.querySelector('#venue').value.trim(),
      tags: form.querySelector('#tags').value
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t),
      capacity: form.querySelector('#capacity').value ? parseInt(form.querySelector('#capacity').value) : null,
      description: form.querySelector('#description').value.trim(),
      createdAt: new Date().toISOString()
    };
    events.push(newEvent);
    saveEvents(events);
    // Clear form
    form.reset();
    alert('Event posted successfully!');
    renderOrganizer();
  });
  app.appendChild(form);

  // List of events created
  const eventsTitle = document.createElement('h3');
  eventsTitle.textContent = 'My Events';
  eventsTitle.style.marginTop = '2rem';
  app.appendChild(eventsTitle);
  const events = getEvents();
  if (events.length === 0) {
    const noEv = document.createElement('p');
    noEv.textContent = 'No events posted yet.';
    app.appendChild(noEv);
  } else {
    events.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
    events.forEach(event => {
      const card = document.createElement('div');
      card.className = 'event-card';
      const h3 = document.createElement('h3');
      h3.textContent = event.title;
      const info = document.createElement('p');
      info.textContent = `${event.date} ${event.time} | ${event.venue}`;
      const description = document.createElement('p');
      description.textContent = event.description;
      const tagDiv = document.createElement('div');
      tagDiv.className = 'tags';
      event.tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        tagDiv.appendChild(span);
      });
      const regs = getRegistrations().filter(r => r.eventId === event.id);
      const regInfo = document.createElement('p');
      regInfo.textContent = `Registrations: ${regs.length}` + (event.capacity ? ` / ${event.capacity}` : '');
      // Export button
      const exportBtn = document.createElement('button');
      exportBtn.className = 'secondary';
      exportBtn.style.marginTop = '0.5rem';
      exportBtn.textContent = 'Export CSV';
      exportBtn.addEventListener('click', () => {
        exportRegistrations(event);
      });
      card.appendChild(h3);
      card.appendChild(info);
      card.appendChild(description);
      card.appendChild(tagDiv);
      card.appendChild(regInfo);
      card.appendChild(exportBtn);
      app.appendChild(card);
    });
  }
}

function exportRegistrations(event) {
  const regs = getRegistrations().filter(r => r.eventId === event.id);
  if (regs.length === 0) {
    alert('No registrations for this event yet.');
    return;
  }
  // Prepare CSV data
  const rows = [['Event Title', 'Date', 'Time', 'Venue', 'Ticket Code']];
  regs.forEach(r => {
    rows.push([event.title, event.date, event.time, event.venue, r.code]);
  });
  const csvContent = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/\s+/g, '_')}_registrations.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}