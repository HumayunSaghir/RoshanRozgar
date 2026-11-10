// Skills offered in the onboarding dropdown, per trade.
export const SKILLS_BY_TRADE = {
  electrician: ['Wiring', 'Fan fitting', 'Switch board', 'UPS fitting', 'Geyser installation', 'Light fitting', 'Short circuit repair', 'Meter and breaker', 'Solar wiring', 'Generator connection'],
  plumber: ['Leak repair', 'Pipe fitting', 'Tank cleaning', 'Bathroom fitting', 'Tap and mixer repair', 'Drain unblocking', 'Water motor repair', 'Geyser plumbing', 'Kitchen sink fitting', 'Sewerage line'],
  ac_technician: ['AC service', 'Gas filling', 'AC installation', 'AC repair', 'Compressor repair', 'Duct cleaning', 'Inverter AC repair', 'Fridge repair'],
  carpenter: ['Door fitting', 'Wardrobe', 'Furniture repair', 'Kitchen cabinets', 'Bed making', 'Window frames', 'Polish and finishing', 'Wood flooring'],
  mechanic: ['Engine work', 'Brake work', 'Bike repair', 'Oil change', 'Suspension', 'Car AC', 'Denting and painting', 'Wheel alignment', 'Battery and electrical'],
  painter: ['Wall paint', 'Polish', 'Distemper', 'Texture and design', 'Waterproofing', 'Exterior paint', 'Wood paint'],
  mason: ['Tiles', 'Plaster', 'Brickwork', 'Marble fitting', 'Floor and roof work', 'Boundary wall', 'Renovation'],
  welder: ['Gate and grill', 'Welding', 'Shed and roof frame', 'Window grill', 'Staircase railing', 'Steel fabrication'],
};

export const skillsFor = (trade) => SKILLS_BY_TRADE[trade] || [];
