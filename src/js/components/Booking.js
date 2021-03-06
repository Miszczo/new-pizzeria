import {templates, select, settings, classNames} from '../settings.js';
import { AmountWidget } from './AmountWidget.js';
import { DatePicker } from './DatePicker.js';
import {HourPicker} from './HourPicker.js';
import {utils} from '../utils.js';

export class Booking{
  constructor(widgetContainer){
    const thisBooking = this;

    thisBooking.render(widgetContainer);
    thisBooking.initWidgets();
    thisBooking.getData();
    thisBooking.selectTable();
  }
  render(widgetContainer){
    const thisBooking = this;

    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};
    thisBooking.dom.wrapper = widgetContainer;

    thisBooking.dom.wrapper.innerHTML = generatedHTML;

    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);

    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);

    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);

    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);

    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);

    thisBooking.dom.inputAddress = thisBooking.dom.wrapper.querySelector(
      select.booking.address
    );
    thisBooking.dom.inputPhone = thisBooking.dom.wrapper.querySelector(
      select.booking.phone
    );
    thisBooking.dom.starters = thisBooking.dom.wrapper.querySelectorAll(
      select.booking.starters
    );
    thisBooking.dom.form = thisBooking.dom.wrapper.querySelector(
      '.booking-form'
    );

    // console.log(thisBooking.dom.tables);

    // console.log(thisBooking.dom.hourPicker);
  }
  initWidgets(){
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    // console.log(thisBooking.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);

    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);

    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.wrapper.addEventListener('updated', function(){
      thisBooking.updateDOM();
    });
    thisBooking.dom.form.addEventListener('submit', function () {
      event.preventDefault();
      thisBooking.sendBooking();
    });
  }

  getData(){
    const thisBooking = this;

    const startEndDates = {};
    startEndDates[settings.db.dateStartParamKey] = utils.dateToStr(thisBooking.datePicker.minDate);
    startEndDates[settings.db.dateEndParamKey] = utils.dateToStr(thisBooking.datePicker.maxDate);

    const endDate = {};
    endDate[settings.db.dateEndParamKey] = startEndDates[settings.db.dateEndParamKey];

    const params = {
      booking: utils.queryParams(startEndDates),
      eventsCurrent: settings.db.notRepeatParam + '&' + utils.queryParams(startEndDates),
      eventsRepeat: settings.db.repeatParam + '&' + utils.queryParams(endDate),
    };

    // console.log('getData params', params);

    const urls = {
      booking: settings.db.url + '/' + settings.db.booking + '?' + params.booking,
      eventsCurrent: settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent,
      eventsRepeat: settings.db.url + '/' + settings.db.event + '?' + params.eventsRepeat,
    };

    // console.log('getData urls', urls);

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function([bookingsResponse, eventsCurrentResponse, eventsRepeatResponse]){
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function([bookings, eventsCurrent, eventsRepeat]){
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat){
    const thisBooking = this;

    // console.log('bookings:', bookings);
    // console.log('eventsCurrent:', eventsCurrent);
    // console.log('eventsRepeat:', eventsRepeat);

    // console.log('eventsRepeat:', eventsRepeat);

    thisBooking.booked = {};
    // console.log('thisBooking.booked:', thisBooking.booked);

    for(let singleCurrentEvent of eventsCurrent){
      // console.log('singleCurrentEvent', singleCurrentEvent);

      thisBooking.makeBooked(
        singleCurrentEvent.date,
        singleCurrentEvent.hour,
        singleCurrentEvent.duration,
        singleCurrentEvent.table
      );
    }

    /* loop for bookings event */
    for(let singleBookingsEvent of bookings){
      // console.log('singleBookingsEvent', singleBookingsEvent);

      thisBooking.makeBooked(
        singleBookingsEvent.date,
        singleBookingsEvent.hour,
        singleBookingsEvent.duration,
        singleBookingsEvent.table
      );
    }
    /* loop for events repeat */

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    // console.log('minDate:', minDate);
    // console.log('maxDate:', maxDate);

    for(let singleEventsRepeat of eventsRepeat){
      // console.log('singleEventsRepeat', singleEventsRepeat);

      if(singleEventsRepeat.repeat == 'daily'){
        for(let i = minDate; i <= maxDate; i= utils.addDays(i, 1)){
          thisBooking.makeBooked(
            utils.dateToStr(i),
            singleEventsRepeat.hour,
            singleEventsRepeat.duration,
            singleEventsRepeat.table
          );
        }
      }
    }

    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table){
    const thisBooking = this;

    // console.log('thisBooking.booked[date];', thisBooking.booked[date]);

    // thisBooking.booked[date] = {};

    if (typeof thisBooking.booked[date] === 'undefined') {
      thisBooking.booked[date] = {};
    }

    // console.log('thisBooking.booked[date];', thisBooking.booked[date]);

    const startHour = utils.hourToNumber(hour);
    // console.log('startHour:', startHour);

    for(let i = startHour; i < startHour + duration; i+=0.5){
      if(typeof thisBooking.booked[date][i] === 'undefined') {
        thisBooking.booked[date][i] = [];
      }
      thisBooking.booked[date][i].push(table);

      // console.log(thisBooking.booked[date][i].push(table));
      // console.log('thisBooking.booked[date]:', thisBooking.booked[date]);
    }
    // console.log('thisBooking.booked:', thisBooking.booked);
  }

  updateDOM(){
    const thisBooking = this;

    // console.log(classNames.booking.tableBooked);

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    const tables = thisBooking.dom.tables;

    const bookingArray = thisBooking.booked[thisBooking.date][thisBooking.hour];

    for(let table of tables){
      // console.log('table:', table);
      const tableNumber = table.getAttribute(settings.booking.tableIdAttribute);
      const tableId = parseInt(tableNumber);
      // console.log(tableNumber);

      if (thisBooking.booked[thisBooking.date] != 'undefined' && thisBooking.booked[thisBooking.date][thisBooking.hour] != 'undefined' && bookingArray.includes(tableId) === true){
        table.classList.add(classNames.booking.tableBooked);
      } else{
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }

  selectTable(){
    const thisBooking = this;

    const tables = thisBooking.dom.tables;
    // console.log('table:', tables);

    for(let table of tables){
      if (!table.classList.contains('booked')){
        table.addEventListener('click', function(){
          table.classList.toggle('selected');
          table.classList.toggle('booked');
          console.log('selected');
        });
      } else {
        table.classList.remove('booked');
      }
      if(table.classList.contains('booked')){
        table.classList.add(classNames.booking.tableBooked);
      }
    }
  }

  sendBooking(){
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.booking;


    const payload = {
      date: thisBooking.date,
      hour: thisBooking.hourPicker.value,
      table: [],
      ppl: thisBooking.peopleAmount.value,
      duration: thisBooking.hoursAmount.value,
      starters: [],
    };

    for (let starter of thisBooking.dom.starters) {
      if (starter.checked == true) {
        payload.starters.push(starter.value);
      }
    }
    const tables = thisBooking.dom.tables;

    for (let table of tables) {

      const tableNumber = table.getAttribute(settings.booking.tableIdAttribute);
      const tableId = parseInt(tableNumber);
      console.log(tableNumber, tableId);

      if (table.classList.contains('selected')) {
        payload.table.push(tableId);
        table.classList.replace('selected', 'booked');
      }
    }
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(function (response) {
        return response.json();
      })
      .then(function (parsedResponse) {
        console.log('parsedResponse', parsedResponse);
      });
  }

}
