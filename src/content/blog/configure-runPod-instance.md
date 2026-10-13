---
tags: [AI, RunPod, Python, DevOps]
title: "Building an Open-Source AI Video Advertising Pipeline: My First Experiments with Wan2.2 and RunPod"
description: "Building an AI video advertising pipeline with Wan2.2 and RunPod: GPU benchmarks, generation costs, and lessons on the limits of commercial quality."
pubDate: 2026-10-12
heroImage: '../../assets/AIVideoBakeryPipeline.webp'

---

## Contents

- [1. Project overview](#1-project-overview)
- [2. Selecting the infrastructure](#2-selecting-the-infrastructure)
  - [Starting with local hardware](#starting-with-local-hardware)
  - [Moving to RunPod](#moving-to-runpod)
- [3. Setting up a reproducible development environment](#3-setting-up-a-reproducible-development-environment)
  - [Installing DiffSynth-Studio](#installing-diffsynth-studio)
- [4. Downloading and configuring Wan2.2](#4-downloading-and-configuring-wan22)
- [5. Debugging GPU and infrastructure issues](#5-debugging-gpu-and-infrastructure-issues)
  - [CUDA compatibility](#cuda-compatibility)
  - [Host instability](#host-instability)
  - [Storage performance](#storage-performance)
- [6. Establishing a text-to-video baseline](#6-establishing-a-text-to-video-baseline)
  - [First successful A40 generation](#first-successful-a40-generation)
- [7. Scaling to a 10-second video](#7-scaling-to-a-10-second-video)
  - [Results](#results)
- [8. Moving from text-to-video to video-to-video](#8-moving-from-text-to-video-to-video-to-video)
  - [Verifying video-to-video support](#verifying-video-to-video-support)
- [9. Preprocessing the source video](#9-preprocessing-the-source-video)
- [10. Building the video-to-video generation script](#10-building-the-video-to-video-generation-script)
- [11. Evaluating the first AI-generated bakery advertisement](#11-evaluating-the-first-ai-generated-bakery-advertisement)
  - [Was the problem the prompt or the model?](#was-the-problem-the-prompt-or-the-model)
- [12. Rethinking the architecture: From video generation to advertising production](#12-rethinking-the-architecture-from-video-generation-to-advertising-production)
- [13. Key technical and business lessons](#13-key-technical-and-business-lessons)
- [14. Next steps](#14-next-steps)
- [Conclusion](#conclusion)



*From GPU infrastructure challenges to video-to-video generation, performance benchmarking, and lessons about AI-generated advertising.*

## 1. Project overview

The goal of this project was to explore whether open-source generative AI models could be used to produce professional advertising videos for small businesses, particularly bakeries, restaurants, and local retailers.

Rather than relying on commercial AI video platforms, I wanted to build a reproducible, Python-based pipeline that I could control, customize, and eventually offer as a service.

The initial objectives were:

- Generate realistic videos from text prompts.
- Transform existing videos using video-to-video (V2V) generation.
- Preserve camera movements and visual composition.
- Experiment with adding or modifying products within existing footage.
- Measure GPU performance, inference times, and costs.
- Evaluate whether the results were suitable for commercial advertising.

The project was developed using **Wan2.2 TI2V-5B**, **DiffSynth-Studio**, and GPU infrastructure rented through **RunPod**.

## 2. Selecting the infrastructure

### Starting with local hardware

My initial experiments were performed on a laptop with an NVIDIA RTX 2070 Max-Q GPU with 8 GB of VRAM.

Although the model could be explored locally, inference was slow, and GPU memory limitations restricted experimentation.

Some generation tests took approximately 20 minutes, making repeated development iterations impractical.

I decided to move the experiments to cloud GPUs.

### Moving to RunPod

I selected RunPod because it offered on-demand access to GPUs without requiring a significant upfront investment in hardware.

I experimented with two GPU configurations:

| GPU | VRAM | Experience |
|---|---:|---|
| NVIDIA RTX 4090 | 24 GB | Successful short tests, but subsequent infrastructure instability |
| NVIDIA A40 | 48 GB | Stable generation of longer videos |

The A40 was available at approximately **$0.49 per hour** during testing.

Although the RTX 4090 offered strong computational performance, the A40's larger VRAM capacity provided more flexibility for longer video experiments.

## 3. Setting up a reproducible development environment

One important decision was separating persistent model storage from temporary development files.

RunPod's persistent volume was mounted at `/workspace`, while the Python environment and source code were installed on the container's local filesystem.

The directory structure was:

```text
/opt/
  projects/
    DiffSynth-Studio/
  venvs/
    diffsynth/

/workspace/
  models/
  cache/
    huggingface/
    modelscope/
    torch/
  inputs/
  outputs/
  setup/
```

This separation became necessary because the persistent volume did not fully support the filesystem permissions required by Git and Python virtual environments.

Attempting to install a virtual environment or clone the repository directly into persistent storage caused permission-related errors.

The solution was to keep executable environments and Git repositories on local storage while retaining expensive model downloads on persistent storage.

### Installing DiffSynth-Studio

I cloned the official repository:

```bash
git clone https://github.com/modelscope/DiffSynth-Studio.git
```

To make experiments reproducible, I pinned the repository to a specific commit:

```text
974cfa37f27ac55eba3b6d10efa21f876900572d
```

The Python environment was created using `venv`, and the project was installed with:

```bash
pip install -e .
```

The working A40 environment used:

- Python 3.12.3
- PyTorch 2.14.1+cu130
- CUDA 13.0 runtime
- NVIDIA A40 GPU
- DiffSynth-Studio

I also saved environment information, dependencies, working scripts, and the Git commit identifier to persistent storage to simplify rebuilding the environment.

## 4. Downloading and configuring Wan2.2

The main generative model was:

**Wan2.2 TI2V-5B**

This model supports text-to-video and image-conditioned video generation.

Using DiffSynth-Studio, I configured model loading through `WanVideoPipeline` and `ModelConfig`.

The model files occupied approximately **31 GB** of persistent storage, including diffusion model shards and supporting components.

A critical optimization was preserving these downloaded files across RunPod instance changes.

Without persistent storage, every new instance could require downloading the model again, increasing setup time and development costs.

I also configured environment variables to direct model caches and downloads into `/workspace`.

## 5. Debugging GPU and infrastructure issues

The setup process revealed several challenges.

### CUDA compatibility

On one RTX 4090 instance, the installed PyTorch build expected a newer NVIDIA driver than the host provided.

As a result, PyTorch could not initialize CUDA.

I resolved this by replacing the incompatible PyTorch installation with a CUDA 12.8-compatible build.

### Host instability

Another RTX 4090 instance became unresponsive during model loading.

Symptoms included:

- GPU memory allocated but almost no GPU utilization.
- Model loading apparently stalled.
- SSH connections timing out.
- Jupyter failing to initialize.

The evidence suggested an infrastructure-level problem, although the precise cause was not established.

Rather than continue troubleshooting an unstable host indefinitely, I moved the experiment to an NVIDIA A40 instance. Time is money right?

### Storage performance

I measured persistent-volume read speeds of approximately **200 MB/s** for large model files.

This helped establish that the A40 instance could read model weights at a reasonable rate.

The broader lesson was that GPU specifications alone do not determine the success of an AI workload. Driver compatibility, storage behavior, model loading, and host reliability all matter.

## 6. Establishing a text-to-video baseline

Before experimenting with existing footage, I needed to confirm that the model could generate videos reliably.

I created a Python smoke-test script that loaded Wan2.2 and generated a cinematic scene using a text prompt.

The test configuration included:

```python
height=480
width=832
num_frames=49
seed=42

tiled=True
tile_size=(16, 16)
tile_stride=(8, 8)
```

VAE tiling was especially important for controlling memory usage during decoding.

### First successful A40 generation

The 49-frame experiment produced the following results:

| Metric | Result |
|---|---:|
| Resolution | 832 × 480 |
| Frames | 49 |
| Output FPS | 15 |
| Model loading | 140.9 seconds |
| Generation | 89.4 seconds |
| Peak GPU memory | 21.98 GB |

This confirmed that the environment, model loading, diffusion process, VAE decoding, and MP4 export were functioning correctly.

## 7. Scaling to a 10-second video

The next experiment increased the output to 149 frames while preserving the same resolution and generation settings.

The objective was to understand how longer video sequences affected inference time and memory consumption.

### Results

| Metric | 49 frames | 149 frames |
|---|---:|---:|
| Resolution | 832 × 480 | 832 × 480 |
| FPS | 15 | 15 |
| Duration | 3.27 seconds | 9.93 seconds |
| Generation time | 89.4 s | 305.9 s |
| Peak VRAM | 21.98 GB | 22.37 GB |

Increasing the number of frames approximately tripled generation time, but GPU memory usage increased only slightly.

This suggested that tiled processing was effectively controlling peak memory consumption for these workloads.

At the observed A40 rental price of $0.49 per hour, the 305.9-second generation phase cost approximately **$0.042 in GPU rental time**, excluding model loading, idle time, storage, and other overhead.

This established a useful performance baseline for future experiments.

## 8. Moving from text-to-video to video-to-video

The next objective was more commercially relevant: transforming an existing social media video into a realistic bakery advertisement.

I selected a video containing several cakes displayed outdoors, with camera movement between different products.

The source video had the following characteristics:

```text
Resolution: 1920 × 1080
Frame rate: 60 FPS
Duration: 11.598 seconds
Frames: 696
```

The goal was to preserve the original camera movement and approximate product placement while transforming the footage into a premium bakery presentation.

I wanted more realistic cake textures, improved lighting, additional pastries, and a polished commercial appearance.

### Verifying video-to-video support

Instead of assuming that the installed model pipeline supported arbitrary video inputs, I inspected the DiffSynth-Studio source code and examples.

The installed `WanVideoPipeline` exposed two important parameters:

```python
input_video=source_video
denoising_strength=0.65
```

The `input_video` parameter provided the source frames for transformation.

The `denoising_strength` parameter controlled how much the generation could deviate from the original footage.

For the first experiment, I selected a value of **0.65**, intending to balance source preservation with substantial visual transformation.

## 9. Preprocessing the source video

One issue appeared immediately: loading the original MP4 through `VideoData` exposed all 696 frames.

Processing all of them would have been unnecessarily expensive for the first experiment.

I used FFmpeg to reduce the footage to a controlled test input:

```bash
ffmpeg -y \
  -i /workspace/inputs/bakery_source.mp4 \
  -vf "fps=15,scale=832:480" \
  -frames:v 149 \
  -an \
  -c:v libx264 \
  -preset slow \
  -crf 16 \
  -pix_fmt yuv420p \
  /workspace/inputs/bakery_source_149f.mp4
```

The resulting test input contained:

- 149 frames
- 15 FPS
- 832 × 480 resolution
- Approximately 9.93 seconds of footage

This allowed a more controlled comparison with the previous text-to-video benchmark.

## 10. Building the video-to-video generation script

I created a new Python script using the working Wan2.2 configuration and DiffSynth's video-loading utility.

The essential generation call was:

```python
video = pipe(
    prompt=prompt,
    negative_prompt=negative_prompt,
    input_video=source_video,
    denoising_strength=0.65,
    seed=42,
    height=480,
    width=832,
    num_frames=149,
    tiled=True,
    tile_size=(16, 16),
    tile_stride=(8, 8),
    num_inference_steps=50,
)
```

The positive prompt described a luxury artisan bakery advertisement, including realistic frosting, chocolate, fruit, croissants, macarons, warm lighting, and professional food cinematography.

The negative prompt attempted to suppress artifacts such as flickering, morphing objects, duplicated pastries, unstable backgrounds, and artificial-looking food.

The generated video was exported as an MP4 and downloaded for visual inspection.

## 11. Evaluating the first AI-generated bakery advertisement

This was the most important finding of the experiment.

**The video was generated, but the result did not feel like a convincing advertisement.**

Although the pipeline could transform existing footage, producing an aesthetically modified video was not equivalent to creating a professionally directed commercial.

The initial prompt emphasized visual characteristics such as:

- Photorealism and detailed food textures.
- Warm, premium commercial lighting.
- Preserving the original camera movement.
- Maintaining product positions and temporal consistency.

However, an effective advertisement requires more than realistic visuals.

It also needs creative direction, deliberate product framing, pacing, emotional appeal, and a clear commercial message.

Furthermore, instructions to preserve the original composition and timing limited how much the model could redesign the scene.

### Was the problem the prompt or the model?

My conclusion is that the limitations came from the combination of prompting, model capabilities, and the overall production workflow.

A better prompt might improve specific visual details, but it cannot reliably replace the creative decisions involved in advertising production.

Increasing denoising strength could produce more dramatic transformations, but it would not necessarily create a better advertisement. It could also reduce temporal consistency and source fidelity.

This changed how I thought about the project.

## 12. Rethinking the architecture: From video generation to advertising production

Initially, the pipeline was essentially:

```text
Existing video
    ↓
Wan2.2 video-to-video
    ↓
Generated video
    ↓
MP4 export
```

After evaluating the result, I realized that a professional advertising system would need a more complete workflow:

```text
Business brief and marketing objectives
    ↓
Creative concept and storyboard
    ↓
Source footage / product references
    ↓
Shot analysis and selection
    ↓
AI generation and transformation
    ↓
Quality assessment and shot selection
    ↓
Video editing and pacing
    ↓
Branding, typography and CTA
    ↓
Audio, music and sound design
    ↓
Final advertising video
```

Instead of expecting one generative model to produce an entire advertisement, each AI generation step should serve a specific creative purpose.

For example, the system could generate a close-up of chocolate frosting, a cinematic cake reveal, or a premium product arrangement.

Those shots could then be assembled into a coherent commercial with branding and sound.

This is a more promising approach for offering AI-assisted advertising services to small businesses.

## 13. Key technical and business lessons

**First, open-source video generation is technically feasible on rented GPUs.** The A40 successfully generated both short and approximately 10-second videos, with manageable GPU memory usage.

**Second, reproducibility matters.** Pinning the repository commit, retaining model downloads, and recording working environment configurations reduced the risk of losing progress when changing cloud instances.

**Third, GPU rental cost is only part of the economics.** Model loading, failed experiments, infrastructure problems, storage, creative iterations, and editing time must also be considered.

**Fourth, photorealism is not the same as commercial quality.** A visually appealing AI-generated scene may still fail to communicate a product's value or persuade a customer.

**Fifth, the product should be the finished advertisement, not simply the AI-generated video.** Businesses care about content that helps them attract customers, communicate their brand, and support sales.

## 14. Next steps

The next development phase will focus on building a modular, script-based AI advertising pipeline rather than relying on one video-to-video generation pass.

The priorities are:

1. Define advertising concepts and shot lists before generation.
2. Evaluate stronger image and video generation workflows for product-specific shots.
3. Introduce automated video editing using FFmpeg and Python.
4. Add consistent branding, text overlays, music, and sound design.
5. Develop repeatable quality checks for visual artifacts and temporal consistency.
6. Test the complete workflow against real business requirements.
7. Measure total production time, GPU costs, and manual editing effort.

The ultimate objective is to create a practical service that helps small businesses produce useful, affordable advertising content using open-source AI.

## Conclusion

This experiment began as a technical challenge: could I run an open-source generative video model and transform existing footage into a realistic commercial?

The infrastructure and generation experiments demonstrated that the technical foundation works.

However, the first bakery advertisement also revealed an important limitation: **generating video is only one part of producing effective advertising.**

The next challenge is no longer simply making the AI generate better-looking footage. It is designing an end-to-end production workflow that combines generative models, creative direction, editing, and branding.

That is the direction I will pursue in the next iteration of this project.
