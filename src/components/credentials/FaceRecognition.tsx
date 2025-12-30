import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ethers } from 'ethers';
import * as faceapi from 'face-api.js';

interface FaceRecognitionProps {
  onVerified: (verified: boolean, faceDescriptor?: number[]) => void;
  isRequired?: boolean;
  mode?: 'capture' | 'verify' | 'register';
  checkDuplicate?: boolean;
  existingFaceHashes?: string[];
  requireLiveness?: boolean;
}

// Hash a face descriptor for secure comparison
function hashFaceDescriptor(descriptor: number[]): string {
  const descriptorString = descriptor.map(d => d.toFixed(6)).join(',');
  return ethers.keccak256(ethers.toUtf8Bytes(descriptorString));
}

// Compare two face descriptors using Euclidean distance
function compareFaceDescriptors(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
}

// Face matching threshold (lower = stricter match)
const FACE_MATCH_THRESHOLD = 0.6;

export function FaceRecognition({ 
  onVerified, 
  isRequired = true,
  mode = 'capture',
  checkDuplicate = false,
  existingFaceHashes = [],
  requireLiveness = true
}: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'processing' | 'verified' | 'failed' | 'duplicate' | 'no_face' | 'liveness_check'>('idle');
  const [livenessStep, setLivenessStep] = useState<'none' | 'blink' | 'smile' | 'done'>('none');
  const [blinkCount, setBlinkCount] = useState(0);
  const [smileDetected, setSmileDetected] = useState(false);
  const [faceDetectionActive, setFaceDetectionActive] = useState(false);

  // Load face-api.js models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsModelsLoading(true);
        const MODEL_URL = '/models';
        
        // Load required models from CDN if local models not available
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL).catch(() => 
            faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
          ),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL).catch(() =>
            faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
          ),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL).catch(() =>
            faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
          ),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL).catch(() =>
            faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
          )
        ]);
        
        setIsModelsLoading(false);
      } catch (error) {
        console.error('Failed to load face detection models:', error);
        toast.error('Failed to load face detection. Please refresh the page.');
        setIsModelsLoading(false);
      }
    };
    
    loadModels();
  }, []);

  const startCamera = useCallback(async () => {
    if (isModelsLoading) {
      toast.error('Face detection models are still loading. Please wait.');
      return;
    }

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
      setLivenessStep(requireLiveness ? 'blink' : 'none');
      setBlinkCount(0);
      setSmileDetected(false);
      
      // Start face detection loop for liveness
      if (requireLiveness) {
        setFaceDetectionActive(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Camera Access Denied - Please allow camera access');
    } finally {
      setIsLoading(false);
    }
  }, [isModelsLoading, requireLiveness]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setFaceDetectionActive(false);
  }, [stream]);

  // Liveness detection loop
  useEffect(() => {
    if (!faceDetectionActive || !videoRef.current || !isCameraActive) return;

    let lastEyeAspectRatio = 1;
    let blinkCounter = 0;
    let animationId: number;

    const detectFace = async () => {
      if (!videoRef.current || !faceDetectionActive) return;

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        if (detection) {
          // Check for blink (eye aspect ratio changes)
          const leftEye = detection.landmarks.getLeftEye();
          const rightEye = detection.landmarks.getRightEye();
          
          // Calculate eye aspect ratio (EAR)
          const calculateEAR = (eye: faceapi.Point[]) => {
            const height1 = Math.abs(eye[1].y - eye[5].y);
            const height2 = Math.abs(eye[2].y - eye[4].y);
            const width = Math.abs(eye[0].x - eye[3].x);
            return (height1 + height2) / (2 * width);
          };

          const leftEAR = calculateEAR(leftEye);
          const rightEAR = calculateEAR(rightEye);
          const avgEAR = (leftEAR + rightEAR) / 2;

          // Detect blink (EAR drops below threshold then recovers)
          if (livenessStep === 'blink') {
            if (lastEyeAspectRatio > 0.2 && avgEAR < 0.15) {
              blinkCounter++;
              setBlinkCount(blinkCounter);
              if (blinkCounter >= 2) {
                setLivenessStep('smile');
                toast.success('Blink detected! Now please smile.');
              }
            }
            lastEyeAspectRatio = avgEAR;
          }

          // Check for smile
          if (livenessStep === 'smile') {
            const expressions = detection.expressions;
            if (expressions.happy > 0.7) {
              setSmileDetected(true);
              setLivenessStep('done');
              toast.success('Smile detected! You can now capture.');
            }
          }
        }
      } catch (error) {
        // Silently handle detection errors
      }

      if (faceDetectionActive && isCameraActive) {
        animationId = requestAnimationFrame(detectFace);
      }
    };

    detectFace();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [faceDetectionActive, isCameraActive, livenessStep]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Check liveness requirements
    if (requireLiveness && livenessStep !== 'done' && livenessStep !== 'none') {
      toast.error('Please complete liveness verification first');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    stopCamera();

    // Process face with ML model
    setVerificationStatus('processing');
    
    try {
      // Detect face with landmarks and get descriptor
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setVerificationStatus('no_face');
        onVerified(false);
        toast.error('No face detected in the image. Please try again.');
        return;
      }

      // Get the 128-dimensional face descriptor from the ML model
      const faceDescriptor = Array.from(detection.descriptor);

      if (faceDescriptor.length !== 128) {
        setVerificationStatus('failed');
        onVerified(false);
        toast.error('Failed to generate face descriptor');
        return;
      }

      // Check for duplicates using hash comparison
      if (checkDuplicate && existingFaceHashes.length > 0) {
        const currentHash = hashFaceDescriptor(faceDescriptor);
        
        if (existingFaceHashes.includes(currentHash)) {
          setVerificationStatus('duplicate');
          onVerified(false);
          toast.error('Duplicate detected! This person already has a credential.');
          return;
        }
      }

      setVerificationStatus('verified');
      onVerified(true, faceDescriptor);
      toast.success('Face captured and verified successfully!');

    } catch (error) {
      console.error('Face processing error:', error);
      setVerificationStatus('failed');
      onVerified(false);
      toast.error('Failed to process face. Please try again.');
    }
  }, [stopCamera, checkDuplicate, existingFaceHashes, onVerified, requireLiveness, livenessStep]);

  const retake = () => {
    setCapturedImage(null);
    setVerificationStatus('idle');
    setLivenessStep(requireLiveness ? 'blink' : 'none');
    setBlinkCount(0);
    setSmileDetected(false);
    startCamera();
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const getLivenessInstructions = () => {
    switch (livenessStep) {
      case 'blink':
        return `Please blink your eyes twice (${blinkCount}/2)`;
      case 'smile':
        return 'Great! Now please smile';
      case 'done':
        return 'Liveness verified! Click capture when ready';
      default:
        return '';
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">
              {mode === 'register' ? 'Face Registration' : mode === 'verify' ? 'Face Verification' : 'Face Capture'}
            </CardTitle>
            <CardDescription>
              {mode === 'register' 
                ? 'Register your face for secure authentication'
                : mode === 'verify'
                ? 'Verify your identity with facial recognition'
                : 'Capture face for identity - ML-powered detection'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isModelsLoading && (
          <Alert className="mb-4 border-blue-500/30 bg-blue-500/5">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            <AlertDescription className="text-sm">
              Loading face detection models... This may take a moment.
            </AlertDescription>
          </Alert>
        )}

        {isRequired && (
          <Alert className="mb-4 border-yellow-500/30 bg-yellow-500/5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-sm">
              Face capture is required. ML-based detection ensures one person per credential.
            </AlertDescription>
          </Alert>
        )}

        {requireLiveness && isCameraActive && livenessStep !== 'done' && livenessStep !== 'none' && (
          <Alert className="mb-4 border-primary/30 bg-primary/5">
            <Eye className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm font-medium">
              {getLivenessInstructions()}
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

            {/* Status Overlay */}
            {verificationStatus === 'processing' && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                  <p className="text-sm">Analyzing face with ML model...</p>
                  <p className="text-xs text-muted-foreground">Detecting landmarks & generating descriptor</p>
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

            {verificationStatus === 'no_face' && (
              <div className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center">
                <div className="text-center p-4 bg-background/90 rounded-lg">
                  <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
                  <p className="font-bold text-yellow-500">No Face Detected</p>
                  <p className="text-sm text-muted-foreground">Please position your face clearly</p>
                </div>
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

            {/* Liveness indicator */}
            {isCameraActive && requireLiveness && livenessStep !== 'none' && (
              <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
                <div className={`px-3 py-1 rounded-full text-xs ${blinkCount >= 2 ? 'bg-green-500/20 text-green-400' : 'bg-secondary text-muted-foreground'}`}>
                  Blink {blinkCount >= 2 ? '✓' : `${blinkCount}/2`}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs ${smileDetected ? 'bg-green-500/20 text-green-400' : 'bg-secondary text-muted-foreground'}`}>
                  Smile {smileDetected ? '✓' : '○'}
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {!isCameraActive && !capturedImage && (
              <Button 
                onClick={startCamera} 
                disabled={isLoading || isModelsLoading}
                className="gradient-primary text-primary-foreground"
              >
                {isLoading || isModelsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isModelsLoading ? 'Loading Models...' : 'Starting...'}
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
                <Button 
                  onClick={capturePhoto} 
                  className="gradient-primary text-primary-foreground"
                  disabled={requireLiveness && livenessStep !== 'done' && livenessStep !== 'none'}
                >
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
