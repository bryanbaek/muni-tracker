import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Bus, Train, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TransitTracker = () => {
    const [transitData, setTransitData] = useState([]);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
  
    // Get user's location
    useEffect(() => {
      const getLocation = () => {
        if (!navigator.geolocation) {
          setError('Geolocation is not supported by your browser');
          return;
        }
  
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            setError('Unable to get your location: ' + error.message);
          }
        );
      };
  
      getLocation();
      // Update location every 5 minutes
      const locationTimer = setInterval(getLocation, 300000);
      return () => clearInterval(locationTimer);
    }, []);
  
    // Fetch transit data from SF Muni API
    const fetchTransitData = async () => {
      if (!location) return;
  
      try {
        // NextBus API endpoint for SF Muni
        // Note: You'll need to replace this with your actual API key and handle it securely
        const radius = 0.1; // 0.1 miles radius
        const url = `https://api.511.org/transit/StopMonitoring?api_key=${process.env.NEXT_PUBLIC_TRANSIT_API_KEY}&agency=SF&format=json&radius=${radius}&lat=${location.lat}&lon=${location.lng}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch transit data');
        
        const data = await response.json();
        
        // Transform API response into our format
        const transformedData = data.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit
          .map(visit => {
            const vehicle = visit.MonitoredVehicleJourney;
            return {
              id: vehicle.VehicleRef,
              line: vehicle.LineRef,
              destination: vehicle.DestinationName,
              stop: vehicle.MonitoredCall.StopPointName,
              arrivalMin: Math.round(vehicle.MonitoredCall.ExpectedArrivalTime / 60),
              lastUpdated: 0
            };
          })
          .filter(route => {
            // Only show arrivals within 15 mins AND only for T-line and 15 bus
            return route.arrivalMin <= 15 && (route.line === 'T' || route.line === '15');
          });
  
        setTransitData(transformedData);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch transit data: ' + err.message);
        setLoading(false);
      }
    };
  
    // Fetch data initially and set up refresh interval
    useEffect(() => {
      if (location) {
        fetchTransitData();
        // Refresh data every minute
        const fetchTimer = setInterval(fetchTransitData, 60000);
        return () => clearInterval(fetchTimer);
      }
    }, [location]);
  
    // Update "last updated" counter every minute
    useEffect(() => {
      const timer = setInterval(() => {
        setTransitData(prev => prev.map(route => ({
          ...route,
          lastUpdated: route.lastUpdated + 1
        })));
      }, 60000);
  
      return () => clearInterval(timer);
    }, []);
  
    if (error) {
      return (
        <Alert variant="destructive" className="m-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
  
    if (loading) {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }
  
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        {transitData.length === 0 ? (
          <Alert>
            <AlertDescription>
              No transit routes found nearby. Please check back later.
            </AlertDescription>
          </Alert>
        ) : (
          transitData.map(route => (
            <Card key={route.id} className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {route.type === 'bus' ? (
                      <Bus className="h-6 w-6 text-blue-600" />
                    ) : (
                      <Train className="h-6 w-6 text-purple-600" />
                    )}
                    <div>
                      <h2 className="text-xl font-bold">
                        {route.type === 'bus' ? 'Bus ' : ''}{route.line}
                      </h2>
                      <p className="text-gray-600">{route.stop}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {route.arrivalMin} min
                    </p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      Updated {route.lastUpdated}m ago
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };
  
  export default TransitTracker;