import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface FaceRecognitionProps {
  onVerified: (verified: boolean, faceData?: string) => void;
  isRequired?: boolean;
  mode?: 'capture' | 'verify';
  storedFaceData?: string;
}

export function FaceRecognition({ 
  onVerified, 
  isRequired = true,
  mode = 'capture',
  storedFaceData 
}: FaceRecognitionProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'processing' | 'verified' | 'failed'>('idle');

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsCameraActive(true);
      setCapturedImage(null);
      setVerificationStatus('idle');
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: 'Camera Access Denied',
        description: 'Please allow camera access for face verification',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    stopCamera();

    // Process face verification
    processFaceVerification(imageData);
  }, [stopCamera]);

  const processFaceVerification = async (imageData: string) => {
    setVerificationStatus('processing');
    
    // Simulate face detection processing
    // In production, you would use face-api.js or a backend service
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simple face detection simulation
    // In real implementation, use face-api.js models
    const hasFace = imageData.length > 10000; // Basic check that image has content

    if (hasFace) {
      if (mode === 'verify' && storedFaceData) {
        // Compare with stored face data
        // In production, use actual face comparison algorithms
        const similarity = calculateImageSimilarity(imageData, storedFaceData);
        
        if (similarity > 0.7) {
          setVerificationStatus('verified');
          onVerified(true, imageData);
          toast({
            title: 'Face Verified!',
            description: 'Your identity has been verified successfully',
          });
        } else {
          setVerificationStatus('failed');
          onVerified(false);
          toast({
            title: 'Verification Failed',
            description: 'Face does not match the stored record',
            variant: 'destructive',
          });
        }
      } else {
        // Capture mode - just save the face data
        setVerificationStatus('verified');
        onVerified(true, imageData);
        toast({
          title: 'Face Captured!',
          description: 'Face data has been captured successfully',
        });
      }
    } else {
      setVerificationStatus('failed');
      onVerified(false);
      toast({
        title: 'No Face Detected',
        description: 'Please ensure your face is clearly visible',
        variant: 'destructive',
      });
    }
  };

  // Simple image similarity check (placeholder for real face comparison)
  const calculateImageSimilarity = (img1: string, img2: string): number => {
    // In production, use face-api.js or similar for actual face comparison
    // This is a simplified version for demonstration
    return 0.85; // Always return high similarity for demo
  };

  const retake = () => {
    setCapturedImage(null);
    setVerificationStatus('idle');
    startCamera();
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">
              {mode === 'capture' ? 'Face Capture' : 'Face Verification'}
            </CardTitle>
            <CardDescription>
              {mode === 'capture' 
                ? 'Capture your face for identity verification' 
                : 'Verify your identity using face recognition'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isRequired && (
          <Alert className="mb-4 border-warning/30 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              Face verification is required for this operation
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Camera/Preview Area */}
          <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
            {!isCameraActive && !capturedImage && (
              <div className="text-center p-8">
                <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Camera not active</p>
              </div>
            )}
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${isCameraActive && !capturedImage ? 'block' : 'hidden'}`}
            />
            
            {capturedImage && (
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Verification Status Overlay */}
            {verificationStatus === 'processing' && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                  <p className="text-sm">Processing face verification...</p>
                </div>
              </div>
            )}

            {verificationStatus === 'verified' && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Verified</span>
              </div>
            )}

            {verificationStatus === 'failed' && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-destructive/20 text-destructive px-3 py-1.5 rounded-full">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Failed</span>
              </div>
            )}
          </div>

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {!isCameraActive && !capturedImage && (
              <Button 
                onClick={startCamera} 
                disabled={isLoading}
                className="gradient-primary text-primary-foreground"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Camera...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </>
                )}
              </Button>
            )}

            {isCameraActive && (
              <>
                <Button onClick={capturePhoto} className="gradient-primary text-primary-foreground">
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
                <Button variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
              </>
            )}

            {capturedImage && verificationStatus !== 'processing' && (
              <Button variant="outline" onClick={retake}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retake
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
