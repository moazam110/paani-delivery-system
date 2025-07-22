# Water Delivery Management System

A standalone web application for managing water delivery requests and customer information. This application has been completely decoupled from Firebase and can be hosted on any server.

## Features

- **Admin Dashboard**: Manage customers, delivery requests, and view analytics
- **Staff Portal**: View and process delivery assignments
- **Local Data Storage**: Uses browser localStorage for data persistence
- **Authentication**: Simple email/password authentication system
- **Responsive Design**: Works on desktop and mobile devices

## Demo Credentials

### Admin Access
- **Email**: admin@waterdelivery.com
- **Password**: admin123

### Staff Access
- **Email**: staff@waterdelivery.com
- **Password**: staff123

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd water-delivery-system
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard pages
│   ├── staff/             # Staff portal pages
│   ├── login/             # Authentication page
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # Reusable UI components
│   └── shared/            # Shared components
├── lib/
│   ├── firebase.ts        # Local storage data service (renamed for compatibility)
│   └── utils.ts           # Utility functions
└── types/
    └── index.ts           # TypeScript type definitions
```

## Data Persistence

The application uses browser localStorage for data persistence with the following structure:

- **Users**: `water_delivery_users`
- **Customers**: `water_delivery_customers` 
- **Delivery Requests**: `water_delivery_requests`
- **Notifications**: `water_delivery_notifications`
- **Current User**: `water_delivery_current_user`

### Sample Data

The application comes with sample data including:
- 2 default customers
- Default admin and staff users
- No delivery requests (you can create them via the interface)

## Deployment

This is a standard Next.js application and can be deployed to any hosting platform:

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Deploy automatically

### Traditional Hosting
1. Run `npm run build`
2. Run `npm start` on your server
3. Ensure Node.js is available on the hosting environment

### Docker
Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## API Routes

The application is fully client-side with no API dependencies. All data management happens in the browser using localStorage.

## Features Overview

### Admin Dashboard
- View statistics (customers, pending deliveries, daily metrics)
- Manage customer database
- Create and manage delivery requests
- View notifications
- Mark deliveries as completed

### Staff Portal
- View assigned delivery requests
- Filter by status (pending, today, all)
- Mark deliveries as completed or pending confirmation
- Emergency request highlighting

### Customer Management
- Add new customers with contact information
- Set default can quantities
- Add notes for special instructions
- Update customer information

### Delivery Request Management
- Create delivery requests for existing customers
- Set priority levels (normal/emergency)
- Add order details and internal notes
- Schedule deliveries
- Track status progression

## Customization

### Styling
The application uses Tailwind CSS for styling. Customize the design by modifying:
- `src/app/globals.css` for global styles
- `tailwind.config.ts` for theme configuration

### Data Model
Modify the TypeScript interfaces in `src/types/index.ts` to add new fields or change the data structure.

### Authentication
The current authentication is basic email/password. To enhance security:
1. Add password hashing
2. Implement JWT tokens
3. Add role-based permissions
4. Connect to a proper authentication service

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 90+
- Safari 14+

## Limitations

- Data is stored locally in browser storage (not persistent across devices)
- No real-time synchronization between users
- Basic authentication without advanced security features
- No backup/restore functionality

## Migrating from Firebase

If you have existing Firebase data, you can migrate it by:
1. Exporting data from Firebase
2. Converting timestamp fields to JavaScript Date objects
3. Importing data via the browser console using the localStorage functions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository or contact the development team.
