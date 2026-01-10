import zipfile
import os

deps = ['@grpc', 'crypto-js', 'google-protobuf', 'module-alias', 'winston', 'uuid', '@inworld']
base_dir = 'node_modules'
zip_name = 'deps.zip'

with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zf:
    for dep in deps:
        dep_path = os.path.join(base_dir, dep)
        if not os.path.exists(dep_path):
            print(f"Warning: {dep_path} not found")
            continue
        for root, dirs, files in os.walk(dep_path):
            for file in files:
                file_path = os.path.join(root, file)
                # Archive name should be relative to node_modules (e.g. @grpc/grpc-js/index.js)
                # But extracting into node_modules means we want archive to start with @grpc/...
                arcname = os.path.relpath(file_path, base_dir)
                zf.write(file_path, arcname)
print(f"Created {zip_name}")
