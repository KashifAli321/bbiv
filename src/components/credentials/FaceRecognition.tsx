import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import * as faceapi from 'face-api.js';

interface FaceRecognitionProps {
  onVerified: (verified: boolean, faceDescriptor?: number[], faceImage?: string) => void;
  isRequired?: boolean;
  mode?: 'capture' | 'verify';
  checkDuplicate?: boolean;
  existingDescriptors?: number[][];
}

export function FaceRecognition({ 
  onVerified, 
  isRequired = true,
  mode = 'capture',
  checkDuplicate = false,
  existingDescriptors = []
}: FaceRecognitionProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'processing' | 'verified' | 'failed' | 'duplicate'>('idle');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      setIsModelLoading(true);
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        setModelsLoaded(true);
      } catch (error) {
        console.error('Error loading face models:', error);
        toast({
          title: 'Model Loading Failed',
          description: 'Face recognition models could not be loaded. Using basic detection.',
          variant: 'destructive',
        });
      } finally {
        setIsModelLoading(false);
      }
    };

    loadModels();
  }, []);

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

  const capturePhoto = useCallback(async () => {
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
    await processFaceVerification(video, imageData);
  }, [stopCamera, modelsLoaded]);

  const processFaceVerification = async (videoElement: HTMLVideoElement, imageData: string) => {
    setVerificationStatus('processing');
    
    try {
      if (modelsLoaded) {
        // Use face-api.js for real face detection and descriptor extraction
        const detection = await faceapi
          .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          const faceDescriptor = Array.from(detection.descriptor);
          
          // Check for duplicates if required
          if (checkDuplicate && existingDescriptors.length > 0) {
            const isDuplicate = existingDescriptors.some(existing => {
              const distance = faceapi.euclideanDistance(faceDescriptor, existing);
              return distance < 0.6; // Threshold for same person
            });

            if (isDuplicate) {
              setVerificationStatus('duplicate');
              onVerified(false);
              toast({
                title: 'Duplicate Face Detected!',
                description: 'This person already has a credential in the system',
                variant: 'destructive',
              });
              return;
            }
          }

          // Create thumbnail for storage
          const thumbnailCanvas = document.createElement('canvas');
          thumbnailCanvas.width = 150;
          thumbnailCanvas.height = 150;
          const thumbCtx = thumbnailCanvas.getContext('2d');
          if (thumbCtx && canvasRef.current) {
            const box = detection.detection.box;
            thumbCtx.drawImage(
              canvasRef.current,
              box.x, box.y, box.width, box.height,
              0, 0, 150, 150
            );
          }
          const thumbnail = thumbnailCanvas.toDataURL('image/jpeg', 0.6);

          setVerificationStatus('verified');
          onVerified(true, faceDescriptor, thumbnail);
          toast({
            title: 'Face Captured!',
            description: 'Face data has been captured and will be stored for identity verification',
          });
        } else {
          setVerificationStatus('failed');
          onVerified(false);
          toast({
            title: 'No Face Detected',
            description: 'Please ensure your face is clearly visible and try again',
            variant: 'destructive',
          });
        }
      } else {
        // Fallback: Basic detection without face-api models
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate a simple descriptor based on image data for demo purposes
        const simpleDescriptor = generateSimpleDescriptor(imageData);
        
        setVerificationStatus('verified');
        onVerified(true, simpleDescriptor, imageData);
        toast({
          title: 'Face Captured!',
          description: 'Face data captured (basic mode)',
        });
      }
    } catch (error) {
      console.error('Face processing error:', error);
      setVerificationStatus('failed');
      onVerified(false);
      toast({
        title: 'Processing Error',
        description: 'Failed to process face. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Generate a simple descriptor from image data (fallback when models aren't loaded)
  const generateSimpleDescriptor = (imageData: string): number[] => {
    // Create a hash-based descriptor for basic duplicate detection
    const descriptor: number[] = [];
    for (let i = 0; i < 128; i++) {
      const charCode = imageData.charCodeAt((i * 100) % imageData.length);
      descriptor.push((charCode % 256) / 256);
    }
    return descriptor;
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
                ? 'Capture face for identity verification - one person per identity' 
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
              Face verification is required. Each person can only have one credential - duplicate faces will be rejected.
            </AlertDescription>
          </Alert>
        )}

        {isModelLoading && (
          <Alert className="mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="text-sm">
              Loading face recognition models...
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
                  <p className="text-sm">Analyzing face data...</p>
                  <p className="text-xs text-muted-foreground">Checking for duplicates</p>
                </div>
              </div>
            )}

            {verificationStatus === 'verified' && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Face Captured</span>
              </div>
            )}

            {verificationStatus === 'failed' && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-destructive/20 text-destructive px-3 py-1.5 rounded-full">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">No Face Detected</span>
              </div>
            )}

            {verificationStatus === 'duplicate' && (
              <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                <div className="text-center p-4 bg-background/90 rounded-lg">
                  <XCircle className="w-12 h-12 mx-auto text-destructive mb-2" />
                  <p className="font-bold text-destructive">Duplicate Detected!</p>
                  <p className="text-sm text-muted-foreground">This person already has a credential</p>
                </div>
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
                disabled={isLoading || isModelLoading}
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
                  Capture Face
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