import { useState } from 'react';
import { FiUpload, FiAlertCircle } from 'react-icons/fi';
import { fileService } from '../api/fileService';
import CustomSelect from './CustomSelect';

export default function FileUpload({ onUploadSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState(0);
  const [thumbnailData, setThumbnailData] = useState(null);
  const [thumbnailGenerating, setThumbnailGenerating] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(null);
  const [formData, setFormData] = useState({
    filename: '',
    partName: '',
    description: '',
    material: '',
    partNumber: '',
    quantityUnit: '',
    numberOfPieces: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateThumbnail = async (file) => {
    try {
      setThumbnailGenerating(true);
      setThumbnailError(null);

      const fileName = file.name.toLowerCase();
      const isStepOrIges = fileName.endsWith('.stp') || fileName.endsWith('.step') || fileName.endsWith('.igs') || fileName.endsWith('.iges');

      // Only generate thumbnails for STEP/IGES files
      if (!isStepOrIges) {
        setThumbnailData(null);
        setThumbnailError('Preview not available for this format. STEP and IGES files only.');
        setThumbnailGenerating(false);
        return;
      }

      const [occtModule, threeModule] = await Promise.all([
        import('occt-import-js'),
        import('three')
      ]);

      const occtImport = occtModule.default || occtModule;
      const occt = await occtImport({
        locateFile: (path) => (path.endsWith('.wasm') ? '/occt-import-js.wasm' : path)
      });
      const THREE = threeModule;

      const isIges = fileName.endsWith('.igs') || fileName.endsWith('.iges');
      const buffer = new Uint8Array(await file.arrayBuffer());

      const readStep = occt.ReadStepFile || occt.ReadSTEPFile;
      const readIges = occt.ReadIgesFile || occt.ReadIGESFile;

      if (isIges && !readIges) {
        throw new Error('IGES parser not available');
      }
      if (!isIges && !readStep) {
        throw new Error('STEP parser not available');
      }

      const importParams = { linearUnit: 'millimeter' };
      const result = isIges ? readIges(buffer, importParams) : readStep(buffer, importParams);
      const meshes = result?.meshes || [];

      if (!meshes.length) {
        throw new Error('No mesh data found');
      }

      const scene = new THREE.Scene();
      const group = new THREE.Group();

      meshes.forEach((mesh) => {
        const geometry = new THREE.BufferGeometry();
        const positions = mesh.vertices || mesh.attributes?.position?.array;
        const normals = mesh.normals || mesh.attributes?.normal?.array;
        const rawIndices = mesh.indices || mesh.index?.array;

        if (positions?.length) {
          geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        }
        if (normals?.length) {
          geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
        } else {
          geometry.computeVertexNormals();
        }
        if (rawIndices?.length) {
          const indices = Array.isArray(rawIndices[0]) ? rawIndices.flat() : rawIndices;
          geometry.setIndex(indices);
        }

        let materialColor = new THREE.Color('#94a3b8');
        if (Array.isArray(mesh.color) && mesh.color.length >= 3) {
          const [r, g, b] = mesh.color;
          materialColor = new THREE.Color(
            r > 1 ? r / 255 : r,
            g > 1 ? g / 255 : g,
            b > 1 ? b / 255 : b
          );
        }

        const material = new THREE.MeshStandardMaterial({
          color: materialColor,
          metalness: 0.1,
          roughness: 0.8
        });

        const meshObject = new THREE.Mesh(geometry, material);
        group.add(meshObject);
      });

      scene.add(group);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
      directionalLight.position.set(3, 4, 5);
      scene.add(ambientLight);
      scene.add(directionalLight);

      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      group.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      const distance = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360));
      camera.position.set(distance, distance, distance);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      const canvas = document.createElement('canvas');
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
      });
      renderer.setSize(256, 256);
      renderer.setClearColor(0x000000, 0);
      renderer.render(scene, camera);

      const dataUrl = renderer.domElement.toDataURL('image/png');
      setThumbnailData(dataUrl);
    } catch (thumbError) {
      setThumbnailData(null);
      setThumbnailError(thumbError.message || 'Thumbnail generation failed');
    } finally {
      setThumbnailGenerating(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      const allowedExtensions = ['.stp', '.step', '.igs', '.iges', '.stl', '.dxf', '.dwg', '.x_t', '.x_b', '.sat', '.3dm', '.prt', '.sldprt', '.sldasm', '.fcstd'];
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        setError(`Only CAD files are allowed: ${allowedExtensions.join(', ')}`);
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        setError('File size must not exceed 500 MB');
        return;
      }
      setFormData(prev => ({
        ...prev,
        filename: file.name
      }));
      setError(null);
      setThumbnailData(null);
      setThumbnailError(null);
      await generateThumbnail(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    setProgress(0);

    try {
      if (!formData.filename) {
        throw new Error('Please select a file');
      }
      if (!formData.partName) {
        throw new Error('Please enter part name');
      }
      if (!formData.material) {
        throw new Error('Please enter material');
      }

      // Step 1: Request upload URL
      const fileInput = document.querySelector('input[type="file"]');
      const file = fileInput?.files[0];
      
      if (!file) {
        throw new Error('No file selected. Please select a file to upload.');
      }
      
      const lowerName = formData.filename.toLowerCase();
      const contentType = lowerName.endsWith('.igs') || lowerName.endsWith('.iges')
        ? 'application/iges'
        : 'application/step';

      const uploadData = {
        filename: formData.filename,
        content_type: contentType,
        description: formData.description || '',
        material: formData.material || '',
        part_number: formData.partNumber || '',
        quantity_unit: formData.quantityUnit || 'pieces',
      };

      const urlResponse = await fileService.requestUploadUrl(uploadData);
      
      if (!urlResponse || !urlResponse.upload_url) {
        throw new Error('Failed to get upload URL from server');
      }
      
      const { upload_url, file_id } = urlResponse;

      // Step 2: Upload file to presigned URL
      if (!upload_url) {
        throw new Error('Invalid upload URL received from server');
      }
      
      await fileService.uploadFile(upload_url, file, setProgress);

      setSuccess(`Quote request submitted successfully! Your request for "${formData.filename}" has been sent to manufacturers.`);
      setFormData({ filename: '', partName: '', description: '', material: '', partNumber: '', quantityUnit: '', numberOfPieces: '' });
      setThumbnailData(null);
      setThumbnailError(null);
      fileInput.value = '';

      // Call parent callback
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Upload failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-8 w-full">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 flex items-center gap-2 mb-2">
          <FiUpload className="text-manufacturing-primary" />
          Request for Quote
        </h2>
        <p className="text-sm text-slate-500 mb-6">Upload any CAD file (.STEP, .IGES, .STL, .DXF, .DWG, .SAT, .3DM, .PRT, .SLDPRT, .FCSTD, etc). Maximum file size is 500 MB.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start">
          <FiAlertCircle className="mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
          <p className="font-semibold">✓ Success</p>
          <p className="text-sm">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File Input */}
        <div>
          <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-manufacturing-primary transition bg-slate-50">
            <input
              type="file"
              accept=".stp,.step,.igs,.iges,.stl,.dxf,.dwg,.x_t,.x_b,.sat,.iges,.iges,.3dm,.prt,.sldprt,.sldasm,.fcstd,.STP,.STEP,.IGS,.IGES,.STL,.DXF,.DWG,.SAT,.3DM,.PRT,.SLDPRT,.SLDASM,.FCSTD"
              onChange={handleFileChange}
              disabled={loading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="pointer-events-none">
              <FiUpload className="mx-auto h-10 w-10 text-slate-400 mb-2" />
              <p className="text-slate-700 font-medium">
                {formData.filename || 'Drop your file here'}
              </p>
              <p className="text-sm text-slate-500 mt-1">or click to browse</p>
            </div>
          </div>
        </div>

        {/* Part Name and Part Number - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="partName" className="block text-sm font-medium text-slate-700 mb-2">
              Part Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="partName"
              name="partName"
              placeholder="e.g., Washer, Bolt, Engine Block"
              value={formData.partName}
              onChange={handleInputChange}
              disabled={loading}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
            />
          </div>

          {/* Part Number Field */}
          <div>
            <label htmlFor="partNumber" className="block text-sm font-medium text-slate-700 mb-2">
              Part Number <span className="text-slate-400 text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              id="partNumber"
              name="partNumber"
              placeholder="e.g., PN-12345"
              value={formData.partNumber}
              onChange={handleInputChange}
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
            />
          </div>
        </div>
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="e.g., Upper control arm CAD file - Rev 2"
            value={formData.description}
            onChange={handleInputChange}
            disabled={loading}
            rows="3"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
          />
        </div>

        {/* Material and Quantity Unit - Moved to Bottom for Dropdown Space */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="material" className="block text-sm font-medium text-slate-700 mb-2">
              Material <span className="text-red-500">*</span>
            </label>
            <CustomSelect
              id="material"
              name="material"
              value={formData.material}
              onChange={handleInputChange}
              disabled={loading}
              placeholder="Select material..."
              options={[
                { value: 'Aluminum', label: 'Aluminum' },
                { value: 'Steel', label: 'Steel' },
                { value: 'Stainless Steel', label: 'Stainless Steel' },
                { value: 'Carbon Steel', label: 'Carbon Steel' },
                { value: 'Brass', label: 'Brass' },
                { value: 'Copper', label: 'Copper' },
                { value: 'Bronze', label: 'Bronze' },
                { value: 'Titanium', label: 'Titanium' },
                { value: 'Cast Iron', label: 'Cast Iron' },
                { value: 'Zinc', label: 'Zinc' },
                { value: 'ABS', label: 'ABS' },
                { value: 'PLA', label: 'PLA' },
                { value: 'PETG', label: 'PETG' },
                { value: 'Nylon', label: 'Nylon' },
                { value: 'Polycarbonate', label: 'Polycarbonate' },
                { value: 'Acetal (Delrin)', label: 'Acetal (Delrin)' },
                { value: 'PEEK', label: 'PEEK' },
                { value: 'Polypropylene', label: 'Polypropylene' },
                { value: 'PVC', label: 'PVC' },
                { value: 'HDPE', label: 'HDPE' },
                { value: 'Carbon Fiber', label: 'Carbon Fiber' },
                { value: 'Fiberglass', label: 'Fiberglass' },
                { value: 'G10/FR4', label: 'G10/FR4' },
                { value: 'Wood', label: 'Wood' },
                { value: 'Rubber', label: 'Rubber' },
                { value: 'Silicone', label: 'Silicone' },
                { value: 'Ceramic', label: 'Ceramic' },
                { value: 'Glass', label: 'Glass' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>

          {/* Quantity Unit Field */}
          <div>
            <label htmlFor="quantityUnit" className="block text-sm font-medium text-slate-700 mb-2">
              Quantity Unit <span className="text-red-500">*</span>
            </label>
            <select
              id="quantityUnit"
              name="quantityUnit"
              value={formData.quantityUnit}
              onChange={handleInputChange}
              disabled={loading}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
            >
              <option value="">Select quantity unit...</option>
              <option value="pieces">Pieces</option>
              <option value="assemblies">Assemblies</option>
            </select>
          </div>
        </div>

        {/* Number of Pieces - Conditionally Shown */}
        {formData.quantityUnit === 'pieces' && (
          <div>
            <label htmlFor="numberOfPieces" className="block text-sm font-medium text-slate-700 mb-2">
              Number of Pieces <span className="text-slate-400 text-xs">(Optional)</span>
            </label>
            <input
              type="number"
              id="numberOfPieces"
              name="numberOfPieces"
              placeholder="e.g., 100, 500, 1000"
              value={formData.numberOfPieces}
              onChange={handleInputChange}
              disabled={loading}
              min="1"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent"
            />
          </div>
        )}

        {/* Upload Progress */}
        {loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              {progress > 0 ? (
                <div
                  className="bg-manufacturing-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              ) : (
                <div className="h-2 w-1/3 bg-manufacturing-accent animate-pulse"></div>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !formData.filename || thumbnailGenerating}
            className="bg-manufacturing-accent hover:opacity-90 text-white font-semibold py-2.5 px-5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FiUpload />
            {loading ? 'Submitting Request...' : 'Request Quote'}
          </button>
        </div>
      </form>
    </div>
  );
}
