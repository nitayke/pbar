ARG DOTNET_RUNTIME_IMAGE=your-artifactory.example.com/docker-virtual/mcr.microsoft.com/dotnet/aspnet:7.0
ARG DOTNET_SDK_IMAGE=your-artifactory.example.com/docker-virtual/mcr.microsoft.com/dotnet/sdk:7.0

FROM ${DOTNET_RUNTIME_IMAGE} AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

FROM ${DOTNET_SDK_IMAGE} AS build
WORKDIR /src
COPY ["NuGet.config", "./"]
COPY ["Pbar.Api.csproj", "./"]
RUN dotnet restore "Pbar.Api.csproj" --configfile ./NuGet.config
COPY . .
RUN dotnet publish "Pbar.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Pbar.Api.dll"]
