# This file is generated by gyp; do not edit.

TOOLSET := target
TARGET := gio
DEFS_Debug := \
	'-DNODE_GYP_MODULE_NAME=gio' \
	'-DUSING_UV_SHARED=1' \
	'-DUSING_V8_SHARED=1' \
	'-DV8_DEPRECATION_WARNINGS=1' \
	'-DV8_DEPRECATION_WARNINGS' \
	'-DV8_IMMINENT_DEPRECATION_WARNINGS' \
	'-D_GLIBCXX_USE_CXX11_ABI=1' \
	'-DELECTRON_ENSURE_CONFIG_GYPI' \
	'-D_LARGEFILE_SOURCE' \
	'-D_FILE_OFFSET_BITS=64' \
	'-DUSING_ELECTRON_CONFIG_GYPI' \
	'-DV8_COMPRESS_POINTERS' \
	'-DV8_COMPRESS_POINTERS_IN_SHARED_CAGE' \
	'-DV8_ENABLE_SANDBOX' \
	'-DV8_31BIT_SMIS_ON_64BIT_ARCH' \
	'-D__STDC_FORMAT_MACROS' \
	'-DOPENSSL_NO_PINSHARED' \
	'-DOPENSSL_THREADS' \
	'-DOPENSSL_NO_ASM' \
	'-DBUILDING_NODE_EXTENSION' \
	'-DDEBUG' \
	'-D_DEBUG' \
	'-DV8_ENABLE_CHECKS'

# Flags passed to all source files.
CFLAGS_Debug := \
	-fPIC \
	-pthread \
	-Wall \
	-Wextra \
	-Wno-unused-parameter \
	-m64 \
	-I/usr/include/glib-2.0 \
	-I/usr/lib/x86_64-linux-gnu/glib-2.0/include \
	-lglib-2.0 \
	-g \
	-O0

# Flags passed to only C files.
CFLAGS_C_Debug :=

# Flags passed to only C++ files.
CFLAGS_CC_Debug := \
	-fno-rtti \
	-fno-exceptions \
	-std=gnu++17

INCS_Debug := \
	-I/home/michael/.cache/node-gyp/24.1.3/include/node \
	-I/home/michael/.cache/node-gyp/24.1.3/src \
	-I/home/michael/.cache/node-gyp/24.1.3/deps/openssl/config \
	-I/home/michael/.cache/node-gyp/24.1.3/deps/openssl/openssl/include \
	-I/home/michael/.cache/node-gyp/24.1.3/deps/uv/include \
	-I/home/michael/.cache/node-gyp/24.1.3/deps/zlib \
	-I/home/michael/.cache/node-gyp/24.1.3/deps/v8/include \
	-I/usr/include/glib-2.0 \
	-I$(srcdir)/node_modules/nan

DEFS_Release := \
	'-DNODE_GYP_MODULE_NAME=gio' \
	'-DUSING_UV_SHARED=1' \
	'-DUSING_V8_SHARED=1' \
	'-DV8_DEPRECATION_WARNINGS=1' \
	'-DV8_DEPRECATION_WARNINGS' \
	'-DV8_IMMINENT_DEPRECATION_WARNINGS' \
	'-D_GLIBCXX_USE_CXX11_ABI=1' \
	'-DELECTRON_ENSURE_CONFIG_GYPI' \
	'-D_LARGEFILE_SOURCE' \
	'-D_FILE_OFFSET_BITS=64' \
	'-DUSING_ELECTRON_CONFIG_GYPI' \
	'-DV8_COMPRESS_POINTERS' \
	'-DV8_COMPRESS_POINTERS_IN_SHARED_CAGE' \
	'-DV8_ENABLE_SANDBOX' \
	'-DV8_31BIT_SMIS_ON_64BIT_ARCH' \
	'-D__STDC_FORMAT_MACROS' \
	'-DOPENSSL_NO_PINSHARED' \
	'-DOPENSSL_THREADS' \
	'-DOPENSSL_NO_ASM' \
	'-DBUILDING_NODE_EXTENSION'

# Flags passed to all source files.
CFLAGS_Release := \
	-fPIC \
	-pthread \
	-Wall \
	-Wextra \
	-Wno-unused-parameter \
	-m64 \
	-I/usr/include/glib-2.0 \
	-I/usr/lib/x86_64-linux-gnu/glib-2.0/include \
	-lglib-2.0 \
	-O3 \
	-fno-omit-frame-pointer

# Flags passed to only C files.
CFLAGS_C_Release :=

# Flags passed to only C++ files.
CFLAGS_CC_Release := \
	-fno-rtti \
	-fno-exceptions \
	-std=gnu++17

INCS_Release := \
	-I/home/michael/.cache/node-gyp/24.1.3/include/node \
	-I/home/michael/.cache/node-gyp/24.1.3/src \
	-I/home/michael/.cache/node-gyp/24.1.3/deps/openssl/config \
	-I/home/michael/.cache/node-gyp/24.1.3/deps/openssl/openssl/include \
	-I/home/michael/.cache/node-gyp/24.1.3/deps/uv/include \
	-I/home/michael/.cache/node-gyp/24.1.3/deps/zlib \
	-I/home/michael/.cache/node-gyp/24.1.3/deps/v8/include \
	-I/usr/include/glib-2.0 \
	-I$(srcdir)/node_modules/nan

OBJS := \
	$(obj).target/$(TARGET)/src/gio.o

# Add to the list of files we specially track dependencies for.
all_deps += $(OBJS)

# CFLAGS et al overrides must be target-local.
# See "Target-specific Variable Values" in the GNU Make manual.
$(OBJS): TOOLSET := $(TOOLSET)
$(OBJS): GYP_CFLAGS := $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))  $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_C_$(BUILDTYPE))
$(OBJS): GYP_CXXFLAGS := $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))  $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_CC_$(BUILDTYPE))

# Suffix rules, putting all outputs into $(obj).

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(srcdir)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

# Try building from generated source, too.

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(obj).$(TOOLSET)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(obj)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

# End of this set of suffix rules
### Rules for final target.
LDFLAGS_Debug := \
	-pthread \
	-rdynamic \
	-m64

LDFLAGS_Release := \
	-pthread \
	-rdynamic \
	-m64

LIBS := \
	-lgio-2.0 \
	-lgobject-2.0 \
	-lglib-2.0

$(obj).target/gio.node: GYP_LDFLAGS := $(LDFLAGS_$(BUILDTYPE))
$(obj).target/gio.node: LIBS := $(LIBS)
$(obj).target/gio.node: TOOLSET := $(TOOLSET)
$(obj).target/gio.node: $(OBJS) FORCE_DO_CMD
	$(call do_cmd,solink_module)

all_deps += $(obj).target/gio.node
# Add target alias
.PHONY: gio
gio: $(builddir)/gio.node

# Copy this to the executable output path.
$(builddir)/gio.node: TOOLSET := $(TOOLSET)
$(builddir)/gio.node: $(obj).target/gio.node FORCE_DO_CMD
	$(call do_cmd,copy)

all_deps += $(builddir)/gio.node
# Short alias for building this executable.
.PHONY: gio.node
gio.node: $(obj).target/gio.node $(builddir)/gio.node

# Add executable to "all" target.
.PHONY: all
all: $(builddir)/gio.node

