#!/usr/bin/env python3
"""Generate NanamiCat.xcodeproj for the SwiftUI app."""
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IOS = ROOT / "NanamiCat-iOS"
APP = IOS / "NanamiCat"
PROJECT = IOS / "NanamiCat.xcodeproj"


def uid():
    return uuid.uuid4().hex[:24].upper()


def collect_files():
    swift = sorted(str(p.relative_to(APP)).replace("\\", "/") for p in APP.rglob("*.swift"))
    resources = []
    for rel in ["Resources/puzzle-data.json", "Resources/wechat-pay.jpg", "Resources/Assets.xcassets"]:
        if (APP / rel).exists():
            resources.append(rel)
    return swift, resources


def file_type(path: str) -> str:
    ext = Path(path).suffix.lower()
    return {
        ".swift": "sourcecode.swift",
        ".json": "text.json",
        ".jpg": "image.jpeg",
        ".xcassets": "folder.assetcatalog",
    }.get(ext, "text")


swift_files, resource_files = collect_files()
file_refs = {}
build_swift = []
build_res = []

for path in swift_files:
    fid, bf = uid(), uid()
    file_refs[fid] = path
    build_swift.append((bf, fid, path))

for path in resource_files:
    fid, bf = uid(), uid()
    file_refs[fid] = path
    build_res.append((bf, fid, path))

product_ref = uid()
target = uid()
sources_phase = uid()
resources_phase = uid()
frameworks = uid()
project_uid = uid()
main_group = uid()
products_group = uid()
app_group = uid()
config_list_proj = uid()
config_list_tgt = uid()
debug_proj = uid()
release_proj = uid()
debug_tgt = uid()
release_tgt = uid()

lines = [
    "// !$*UTF8*$!",
    "{",
    "\tarchiveVersion = 1;",
    "\tclasses = {};",
    "\tobjectVersion = 56;",
    "\tobjects = {",
]

for bf, fid, path in build_swift + build_res:
    phase = "Sources" if path.endswith(".swift") else "Resources"
    lines.append(f"\t\t{bf} /* {path} in {phase} */ = {{isa = PBXBuildFile; fileRef = {fid} /* {path} */; }};")

for fid, path in file_refs.items():
    lines.append(
        f"\t\t{fid} /* {path} */ = {{isa = PBXFileReference; lastKnownFileType = {file_type(path)}; path = \"{path}\"; sourceTree = \"<group>\"; }};"
    )

lines.append(
    f"\t\t{product_ref} /* NanamiCat.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = NanamiCat.app; sourceTree = BUILT_PRODUCTS_DIR; }};"
)

child_refs = ", ".join(f"{fid} /* {file_refs[fid]} */" for fid in file_refs)
lines.append(f"\t\t{main_group} = {{isa = PBXGroup; children = ({app_group} /* NanamiCat */, {products_group} /* Products */); sourceTree = \"<group>\"; }};")
lines.append(f"\t\t{products_group} /* Products */ = {{isa = PBXGroup; children = ({product_ref} /* NanamiCat.app */); name = Products; sourceTree = \"<group>\"; }};")
lines.append(f"\t\t{app_group} /* NanamiCat */ = {{isa = PBXGroup; children = ({child_refs}); path = NanamiCat; sourceTree = \"<group>\"; }};")

lines.append(f"\t\t{frameworks} /* Frameworks */ = {{isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0; }};")

src = ", ".join(f"{bf} /* {p} in Sources */" for bf, fid, p in build_swift)
lines.append(f"\t\t{sources_phase} /* Sources */ = {{isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = ({src}); runOnlyForDeploymentPostprocessing = 0; }};")

res = ", ".join(f"{bf} /* {p} in Resources */" for bf, fid, p in build_res)
lines.append(f"\t\t{resources_phase} /* Resources */ = {{isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = ({res}); runOnlyForDeploymentPostprocessing = 0; }};")

lines.append(
    f"\t\t{target} /* NanamiCat */ = {{isa = PBXNativeTarget; buildConfigurationList = {config_list_tgt}; buildPhases = ({sources_phase} /* Sources */, {frameworks} /* Frameworks */, {resources_phase} /* Resources */); buildRules = (); dependencies = (); name = NanamiCat; productName = NanamiCat; productReference = {product_ref}; productType = \"com.apple.product-type.application\"; }};"
)

lines.append(
    f"\t\t{project_uid} /* Project object */ = {{isa = PBXProject; attributes = {{BuildIndependentTargetsInParallel = 1;}}; buildConfigurationList = {config_list_proj}; compatibilityVersion = \"Xcode 14.0\"; developmentRegion = en; hasScannedForEncodings = 0; knownRegions = (en, Base, \"zh-Hans\"); mainGroup = {main_group}; productRefGroup = {products_group}; projectDirPath = \"\"; projectRoot = \"\"; targets = ({target}); }};"
)

common = [
    "ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;",
    "CLANG_ENABLE_MODULES = YES;",
    "CURRENT_PROJECT_VERSION = 1;",
    "ENABLE_PREVIEWS = YES;",
    "GENERATE_INFOPLIST_FILE = YES;",
    "INFOPLIST_KEY_CFBundleDisplayName = \"四格寻踪\";",
    "INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;",
    "INFOPLIST_KEY_UILaunchScreen_Generation = YES;",
    "INFOPLIST_KEY_UISupportedInterfaceOrientations = UIInterfaceOrientationPortrait;",
    "IPHONEOS_DEPLOYMENT_TARGET = 17.0;",
    "LD_RUNPATH_SEARCH_PATHS = \"$(inherited) @executable_path/Frameworks\";",
    "MARKETING_VERSION = 1.0;",
    "PRODUCT_BUNDLE_IDENTIFIER = com.nanamicat.app;",
    "PRODUCT_NAME = \"$(TARGET_NAME)\";",
    "SDKROOT = iphoneos;",
    "SUPPORTED_PLATFORMS = \"iphoneos iphonesimulator\";",
    "SWIFT_EMIT_LOC_STRINGS = YES;",
    "SWIFT_VERSION = 5.0;",
    "TARGETED_DEVICE_FAMILY = \"1,2\";",
]

for cid, name, extra in [
    (debug_proj, "Debug", ["SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;", "ALWAYS_SEARCH_USER_PATHS = NO;"]),
    (release_proj, "Release", ["ALWAYS_SEARCH_USER_PATHS = NO;"]),
    (debug_tgt, "Debug", ["CODE_SIGN_STYLE = Automatic;"]),
    (release_tgt, "Release", ["CODE_SIGN_STYLE = Automatic;"]),
]:
    settings = common + extra
    body = "\n\t\t\t\t".join(settings)
    lines.append(f"\t\t{cid} /* {name} */ = {{isa = XCBuildConfiguration; buildSettings = {{{body}}}; name = {name}; }};")

lines.append(f"\t\t{config_list_proj} = {{isa = XCConfigurationList; buildConfigurations = ({debug_proj} /* Debug */, {release_proj} /* Release */); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release; }};")
lines.append(f"\t\t{config_list_tgt} = {{isa = XCConfigurationList; buildConfigurations = ({debug_tgt} /* Debug */, {release_tgt} /* Release */); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release; }};")
lines.extend(["\t};", f"\trootObject = {project_uid} /* Project object */;", "}"])

PROJECT.mkdir(parents=True, exist_ok=True)
(PROJECT / "project.pbxproj").write_text("\n".join(lines) + "\n")
print(f"Generated {PROJECT / 'project.pbxproj'}")
