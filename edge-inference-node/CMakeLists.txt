cmake_minimum_required(VERSION 3.10)
project(EdgeScanner)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find OpenCV
find_package(OpenCV REQUIRED)

# Standard link for TensorFlow Lite
find_library(TFLITE_LIB tensorflow-lite)
if(NOT TFLITE_LIB)
    message(FATAL_ERROR "TensorFlow Lite library not found")
endif()

find_path(TFLITE_INCLUDE_DIR tensorflow/lite/interpreter.h)
if(NOT TFLITE_INCLUDE_DIR)
  message(FATAL_ERROR "TensorFlow Lite headers not found")
endif()
include_directories(${TFLITE_INCLUDE_DIR})

find_package(Threads REQUIRED)

# Optional: libcurl for cloud sync
find_package(CURL)
if(CURL_FOUND)
    message(STATUS "libcurl found — cloud sync enabled")
    add_definitions(-DCLOUD_SYNC_ENABLED)
    include_directories(${CURL_INCLUDE_DIRS})
else()
    message(STATUS "libcurl not found — cloud sync disabled (local JSON only)")
endif()

include_directories(${OpenCV_INCLUDE_DIRS})

add_executable(edge_scanner src/main.cpp)

target_compile_options(edge_scanner PRIVATE -O3)

target_link_libraries(edge_scanner 
    ${OpenCV_LIBS}
    ${TFLITE_LIB}
    Threads::Threads
)

if(CURL_FOUND)
    target_link_libraries(edge_scanner ${CURL_LIBRARIES})
endif()
