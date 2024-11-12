import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Clock, Bus, Train, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic'

// Dynamically import UI components
const Card = dynamic(() => import('@/components/ui/card').then(mod => mod.Card), {
    ssr: false
  })
  const CardContent = dynamic(() => import('@/components/ui/card').then(mod => mod.CardContent), {
    ssr: false
  })
  const Alert = dynamic(() => import('@/components/ui/alert').then(mod => mod.Alert), {
    ssr: false
  })
  const AlertDescription = dynamic(() => import('@/components/ui/alert').then(mod => mod.AlertDescription), {
    ssr: false
  })

const TransitTracker = () => {
    const [transitData, setTransitData] = useState([]);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    console.log(transitData);
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
    const fetchTransitData = useCallback(async () => {
      if (!location) {
        console.log('Location not available yet');
        return;
      }
  
      try {
        const radius = 0.1;
        const url = `https://api.511.org/transit/StopMonitoring?api_key=${process.env.NEXT_PUBLIC_TRANSIT_API_KEY}&agency=SF&format=json&radius=${radius}&lat=${location.lat}&lon=${location.lng}`;
        
        console.log('Fetching from URL:', url);
        console.log('API Key present:', !!process.env.NEXT_PUBLIC_TRANSIT_API_KEY);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch transit data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Raw API response:', data);
        
        if (!data.ServiceDelivery?.StopMonitoringDelivery?.MonitoredStopVisit) {
          console.error('Unexpected API response structure:', data);
          throw new Error('Invalid API response structure');
        }

        const transformedData = data.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit
          .filter(visit => visit?.MonitoredVehicleJourney)
          .map(visit => {
            const vehicle = visit.MonitoredVehicleJourney;
            return {
              id: vehicle.VehicleRef,
              line: vehicle.LineRef,
              destination: vehicle.DestinationName,
              publishedLineName: vehicle.publishedLineName,
              stop: vehicle.MonitoredCall.StopPointName,
              stopPointRef: vehicle.MonitoredCall.stopPointRef,
              arrivalMin: Math.max(0, Math.round(
                (new Date(vehicle.MonitoredCall.ExpectedArrivalTime) - new Date()) / 60000
              )),
              lastUpdated: 0
            };
          })
          .filter(route => {
            return route.arrivalMin < 20 && (route.line === 'T' || route.line === '15') && (route.stop === '3rd St & 20th St');
          });

        console.log('Transformed data:', transformedData);
        setTransitData(transformedData);
        setLoading(false);
      } catch (err) {
        console.error('Detailed error:', err);
        console.error('Error stack:', err.stack);
        setError('Failed to fetch transit data: ' + err.message);
        setLoading(false);
      }
    }, [location]);
  
    // Fetch data initially and set up refresh interval
    useEffect(() => {
      if (location) {
        fetchTransitData();
        // Refresh data every minute
        const fetchTimer = setInterval(fetchTransitData, 60000);
        return () => clearInterval(fetchTimer);
      }
    }, [location, fetchTransitData]);
  
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
        <ErrorBoundary fallback={<ErrorFallback />}>
            <Suspense fallback={
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
                }>
                <div className="p-4 max-w-md mx-auto space-y-4">
                    {transitData.length === 0 ? (
                    <Alert>
                        <AlertDescription>
                        No transit routes found nearby. Please check back later.
                        </AlertDescription>
                    </Alert>
                    ) : (
                    Object.values(
                        transitData.reduce((acc, route) => {
                        const key = `${route.line}-${route.destination}`;
                        if (!acc[key]) {
                            acc[key] = {
                            ...route,
                            arrivalTimes: [route.arrivalMin]
                            };
                        } else {
                            acc[key].arrivalTimes.push(route.arrivalMin);
                            acc[key].arrivalTimes.sort((a, b) => a - b);
                        }
                        return acc;
                        }, {})
                    ).map(route => (
                        <Card key={`${route.line}-${route.destination}`} className="shadow-lg">
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
                                <p className="text-gray-500 text-sm">To: {route.destination}</p>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <p className="text-xl font-bold text-green-600">
                                {route.arrivalTimes.join(', ')} min
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
            </Suspense>
        </ErrorBoundary>
    );
  };
  
  class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

const ErrorFallback = () => (
  <Alert>
    <AlertDescription>
      Something went wrong loading the transit data. Please try refreshing the page.
    </AlertDescription>
  </Alert>
)

  export default TransitTracker;